export type AdGroup = {
  id: number;
  customName?: string;

  posts: {
    id: string;
    name: string;
    type: "feed" | "preroll" | "3d";
  }[];

  budget: number;
  startTime: string;
  endTime: string;

  targeting: {
    location: string;
    languages: string;
    gender: string;
    ageType: string;
    ageMin?: number;
    ageMax?: number;
    device: string;
  };
};