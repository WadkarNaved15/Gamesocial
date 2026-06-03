export type AdGroup = {
    id: number;
    name: string;

    budget: number;
    startTime: string;
    endTime: string;

    targeting: {
        location: string;
        languages: string;
        gender: "all" | "male" | "female";
        ageType: "all" | "range";
        ageMin?: number;
        ageMax?: number;
        device?: string;
    };
};