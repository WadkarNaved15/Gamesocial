import { SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";

const REGION = process.env.AWS_REGION || "ap-south-1"; 
const INSTANCE_ID = "i-01a193d0790f6d318"; // replace with your Linux instance ID

const ssmClient = new SSMClient({ region: REGION });

export async function startGameSession(gameFolderPath = "/home/ubuntu/Documents") {
  try {
    const params = {
      InstanceIds: [INSTANCE_ID],
      DocumentName: "AWS-RunShellScript",
      Comment: "Start game session",
      Parameters: {
        commands: [
          `bash ${gameFolderPath}/start_services.sh`
        ]
      },
    };

    const command = new SendCommandCommand(params);
    const response = await ssmClient.send(command);

    console.log("SSM Command sent. Command ID:", response.Command.CommandId);
    return response.Command.CommandId;
  } catch (error) {
    console.error("Error sending SSM command:", error);
    throw error;
  }
}
