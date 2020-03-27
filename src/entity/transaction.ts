/* eslint-disable import/no-cycle */
import {
  Entity, Column, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Dinero } from 'dinero.js';
import Subtransaction from './subtransaction';
import User from './user';
import DineroTransformer from './transformer/dinero-transformer';
import BaseEntity from './base-entity';

/**
 * @typedef {BaseEntity} Transaction
 * @property {User.model} from.required - The account from which the transaction is subtracted.
 * @property {User.model} to.required - The user to which the transaction is added.
 * @property {User.model} createdBy - The user that created the transaction, if not same as 'from'.
 * @property {decimal} balance.required - The total balance processed in the transaction.
 * @property {Array.<Subtransaction>} subtransactions.required - The subtransactions belonging to
 *    this transaction.
 */
@Entity()
export default class Transaction extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'from' })
  public from: User;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'to' })
  public to: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  public createdBy?: User;

  @Column({
    type: 'integer',
    transformer: DineroTransformer.Instance,
  })
  public balance: Dinero;

  @OneToMany(() => Subtransaction, (subtransaction) => subtransaction.transaction)
  public subtransactions: Subtransaction;
}
