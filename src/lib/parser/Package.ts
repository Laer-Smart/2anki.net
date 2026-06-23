class Package {
  name: string;

  cardCount: number;

  mcqCount: number;

  mcqSkippedCount: number;

  droppedImageCount: number;

  constructor(
    name: string,
    cardCount: number = 0,
    mcqCount: number = 0,
    mcqSkippedCount: number = 0,
    droppedImageCount: number = 0
  ) {
    this.name = name;
    this.cardCount = cardCount;
    this.mcqCount = mcqCount;
    this.mcqSkippedCount = mcqSkippedCount;
    this.droppedImageCount = droppedImageCount;
  }
}

export default Package;
