import ShareService from '../../services/ShareService';

export interface PublicShareListing {
  token: string;
  title: string | null;
  card_count: number | null;
  created_at: Date;
  view_count: number;
  url: string;
}

export interface PublicShareListingPage {
  decks: PublicShareListing[];
  nextCursor: number | null;
}

class ListPublicSharesUseCase {
  constructor(private readonly shareService: ShareService) {}

  async execute(
    cursor: number,
    pageSize: number
  ): Promise<PublicShareListingPage> {
    const rows = await this.shareService.listPublicShares(cursor, pageSize + 1);
    const hasNextPage = rows.length > pageSize;
    const page = hasNextPage ? rows.slice(0, pageSize) : rows;

    return {
      decks: page.map((row) => ({
        token: row.token,
        title: row.title,
        card_count: row.card_count,
        created_at: row.created_at,
        view_count: row.view_count,
        url: this.shareService.buildShareUrl(row.token),
      })),
      nextCursor: hasNextPage ? cursor + pageSize : null,
    };
  }
}

export default ListPublicSharesUseCase;
