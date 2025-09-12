export interface FileItem { id:number; title:string; size:string; }
export interface GameDetails { status:string; author:string; genre:string; tags:string; }
export interface GameTitleImage { url:string; type:string; }


export interface PageData {
  gameTitle:string;
  postTitle:string;
  postTag:string;
  postDate:string;
  author:string;
  italicQuote:string;
  bodyParagraph1:string;
  bodyParagraph2:string;
  bodyParagraph3:string;
  storeLink:string;
  closingQuote:string;
  signature:string;
  files:FileItem[];
  price:string;
  gameInfoTitle:string;
  gameInfoDescription:string;
  gameDetails:GameDetails;
  screenshots:string[];
  videos:string[];
  bgImage:string;
  gameTitleImage:GameTitleImage|null;
}