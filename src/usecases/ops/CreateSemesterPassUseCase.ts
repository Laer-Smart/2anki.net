import type Stripe from 'stripe';

export const PASS_KIND_METADATA_KEY = '2anki_pass_kind';
export const SEMESTER_PASS_KIND = 'semester';
export const SEMESTER_PASS_PRODUCT_NAME = '2anki Semester Pass';
export const SEMESTER_PASS_AMOUNT_CENTS = 1499;

export interface ProvisionedSemesterPass {
  stripe_product_id: string;
  stripe_price_id: string;
  created_product: boolean;
  created_price: boolean;
}

export class CreateSemesterPassUseCase {
  constructor(private readonly stripe: Stripe) {}

  async execute(): Promise<ProvisionedSemesterPass> {
    const existingProducts = await this.stripe.products.list({
      active: true,
      limit: 100,
    });

    let createdProduct = false;
    let product = existingProducts.data.find(
      (candidate) =>
        candidate.metadata?.[PASS_KIND_METADATA_KEY] === SEMESTER_PASS_KIND
    );
    if (product == null) {
      product = await this.stripe.products.create({
        name: SEMESTER_PASS_PRODUCT_NAME,
        metadata: { [PASS_KIND_METADATA_KEY]: SEMESTER_PASS_KIND },
      });
      createdProduct = true;
    }

    const prices = await this.stripe.prices.list({
      product: product.id,
      active: true,
      limit: 100,
    });
    let createdPrice = false;
    let price = prices.data.find(
      (candidate) =>
        candidate.unit_amount === SEMESTER_PASS_AMOUNT_CENTS &&
        candidate.currency === 'usd' &&
        candidate.recurring == null
    );
    if (price == null) {
      price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: SEMESTER_PASS_AMOUNT_CENTS,
        currency: 'usd',
        metadata: { [PASS_KIND_METADATA_KEY]: SEMESTER_PASS_KIND },
      });
      createdPrice = true;
    }

    return {
      stripe_product_id: product.id,
      stripe_price_id: price.id,
      created_product: createdProduct,
      created_price: createdPrice,
    };
  }
}

export default CreateSemesterPassUseCase;
