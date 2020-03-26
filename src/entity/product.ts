import {
  Entity, Column,
} from 'typeorm';
import { Dinero } from 'dinero.js';
import DineroTransformer from './transformer/dinero-transformer';
import BaseEntity from './base-entity';

@Entity()
/**
 * @typedef {BaseEntity} Product
 * @property {string} name.required - The unique name of the product.
 * @property {decimal} price.required - The price of each product.
 */
export default class Product extends BaseEntity {
  @Column({
    unique: true,
    length: 64,
  })
  public name: string;

  @Column({
    type: 'integer',
    transformer: DineroTransformer.Instance,
  })
  public price: Dinero;
}
