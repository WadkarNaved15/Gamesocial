import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { DynamoDBClient, UpdateItemCommand ,GetItemCommand} from "@aws-sdk/client-dynamodb";

const LEASE_LAMBDA_NAME = process.env.LEASE_LAMBDA_NAME || "leaseGpuWorker";
const RELEASE_LAMBDA_NAME = process.env.RELEASE_LAMBDA_NAME || "releaseGpuWorker";
const WORKERS_TABLE = process.env.WORKERS_TABLE || "gpu_instances_workers";
const lambdaClients = new Map();
const dynamoClients = new Map();

function getLambda(region){

    if(!lambdaClients.has(region)){
        lambdaClients.set(
            region,
            new LambdaClient({
                region
            })
        );
    }

    return lambdaClients.get(region);
}


function getDynamo(region) {
    if (!dynamoClients.has(region)) {
        dynamoClients.set(
            region,
            new DynamoDBClient({ region })
        );
    }

    return dynamoClients.get(region);
}


// export async function claimWorkerInDynamo(workerId, leaseToken, leaseExpiresAt, region) {
//   const dynamo = getDynamo(region);
//   const state = await dynamo.send(new GetItemCommand({
//   TableName: WORKERS_TABLE,
//   Key: { worker_id: { S: workerId } }
// }));

// console.log(
//     "[CLAIM]",
//     {
//         workerId,
//         region,
//         table: WORKERS_TABLE
//     }
// );

// if (!state.Item) {
//   throw new Error(`Worker ${workerId} not found in DynamoDB`);
// }

// console.log("Dynamo BEFORE claim:", state.Item);
//   await dynamo.send(new UpdateItemCommand({
//     TableName: WORKERS_TABLE,
//     Key: { worker_id: { S: workerId } },
//     UpdateExpression: "SET #s = :assigned, leaseToken = :token, leaseExpiresAt = :exp",
//     ConditionExpression: "attribute_not_exists(#s) OR #s = :idle",
//     ExpressionAttributeNames: { "#s": "status" },
//     ExpressionAttributeValues: {
//       ":assigned": { S: "ASSIGNED" },
//       ":idle":     { S: "IDLE" },
//       ":token":    { S: leaseToken },
//       ":exp":      { N: String(leaseExpiresAt) },
//     },
//   }));
//   // Throws ConditionalCheckFailedException if not IDLE — caller catches this
// }


/**
 * Lease a GPU instance
 * ✅ FIXED: Distinguishes SCALING from WAITING
 */
export async function assignOrStartInstance(
    requirements = {}
) {
  try {
    
        const region =
        requirements.preferredRegion ||
        "us-east-1";

        console.log("[Allocator] Invoking Lease Lambda", {
    region,
    payload: {
        action: "LEASE",
        ...requirements
    }
});

    const lambdaClient =
        getLambda(region);

    const command =
        new InvokeCommand({
            FunctionName:
                LEASE_LAMBDA_NAME,
            InvocationType:
                "RequestResponse",
            Payload:
                Buffer.from(
                    JSON.stringify({
                        action: "LEASE",
                        ...requirements,
                    })
                ),
        });

    const response =
        await lambdaClient.send(
            command
        );
    const payload = response.Payload
  ? JSON.parse(Buffer.from(response.Payload).toString())
  : {};

    console.log("[Allocator] Lease response:", {
      status: payload.status,
      workerId: payload.workerId,
      reason: payload.reason
    });

    console.log("Assigning instance...")
    // ✅ CASE 1: Got instance immediately
    if (payload.status === "ASSIGNED") {
      return {
        status: "ASSIGNED",
        workerId: payload.workerId,
        instanceIp: payload.instanceIp,
        region,
        hasGpu: true,
        leaseToken: payload.leaseToken,
        leaseExpiresAt: payload.leaseExpiresAt,
      };
    }

    // ✅ CASE 2: ASG at max → USER QUEUES (long wait)
    if (payload.status === "WAITING") {
      console.log("[Allocator] ASG at max capacity → User goes to QUEUE");
      return {
        status: "WAITING",
        scaling: false,
        queued: true,
        queuePosition: payload.queuePosition,
        totalQueued: payload.totalQueued,
        estimatedWaitMinutes: payload.estimatedWaitMinutes,
        avgSessionDuration: payload.avgSessionDuration,
      };
    }

    // ✅ CASE 3: ASG scaling → USER SKIPS QUEUE (short wait, show ads)
    if (payload.status === "SCALING") {
      console.log("[Allocator] ASG scaling up → User skips queue, shows ads");
      return {
        scaling: true,  // ✅ Skip queue notification
        queued: false,  // ✅ Not in queue
        status: "SCALING"
      };
    }

    if (payload.status === "RETRY") {
      throw new Error("Retry allocation");
    }

    throw new Error(`Unknown Lambda response: ${payload.status}`);
  } catch (err) {
    console.error("[Allocator] Lease error:", err.message);
    throw err;
  }
}

/**
 * Release a GPU instance
 * ✅ Already correct
 */
export async function releaseInstance(workerId, leaseToken, region) {
  if (!workerId || !leaseToken || !region) {
    console.warn("[Allocator] Cannot release: missing parameters");
    return {
      success: false,
      reason: "Missing workerId, leaseToken or region",
    };
  }

  try {
    console.log("[Allocator] Releasing instance:", {
      workerId,
      region,
    });

    const lambdaClient = getLambda(region);

    const command = new InvokeCommand({
      FunctionName: RELEASE_LAMBDA_NAME,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(
        JSON.stringify({
          workerId,
          leaseToken,
          preferredRegion: region,
        })
      ),
    });

    const response = await lambdaClient.send(command);

    const payload = response.Payload
      ? JSON.parse(Buffer.from(response.Payload).toString())
      : {};

    console.log("[Allocator] Release response:", {
      status: payload.status,
      reason: payload.reason,
      workerId: payload.workerId,
      released: payload.released,
    });

    if (payload.status === "OK") {
      return {
        success: true,
        workerId: payload.workerId,
        released: payload.released === true,
        reason: payload.reason,
      };
    }

    if (payload.status === "ERROR") {
      // Worker already leased by another session.
      // Treat as success so cleanup can continue.
      if (payload.reason === "Lease token mismatch") {
        console.warn(
          "[Allocator] Instance already reassigned, ignoring release."
        );

        return {
          success: true,
          workerId: payload.workerId,
          reason: "already reassigned",
        };
      }

      console.error(
        "[Allocator] Release failed:",
        payload.reason
      );

      return {
        success: false,
        workerId: payload.workerId,
        reason: payload.reason,
      };
    }

    console.warn(
      "[Allocator] Unknown release response:",
      payload.status
    );

    return {
      success: false,
      reason: `Unknown status: ${payload.status}`,
      workerId: payload.workerId,
    };

  } catch (err) {
    console.error(
      "[Allocator] Release exception:",
      err
    );

    return {
      success: false,
      workerId,
      error: err.message,
    };
  }
}


export async function renewLease(
    workerId,
    region
) {
    const lambdaClient = getLambda(region);

    const command = new InvokeCommand({
        FunctionName: LEASE_LAMBDA_NAME,
        InvocationType: "Event",
        Payload: Buffer.from(
            JSON.stringify({
                action: "RENEW",
                preferredRegion: region,
                workerId,
            })
        ),
    });

    await lambdaClient.send(command);
}