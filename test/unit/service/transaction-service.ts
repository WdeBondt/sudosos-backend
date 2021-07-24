/**
 *  SudoSOS back-end API service.
 *  Copyright (C) 2020  Study association GEWIS
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published
 *  by the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import express, { Application } from 'express';
import { expect } from 'chai';
import { Connection } from 'typeorm';
import { SwaggerSpecification } from 'swagger-model-validator';
import Transaction from '../../../src/entity/transactions/transaction';
import Database from '../../../src/database/database';
import seedDatabase from '../../seed';
import { RequestWithToken } from '../../../src/middleware/token-middleware';
import TransactionService from '../../../src/service/transaction-service';
import { verifyBaseTransactionEntity } from '../validators';
import Swagger from '../../../src/start/swagger';
import { TransactionRequest } from '../../../src/controller/request/transaction-request';

describe('TransactionService', (): void => {
  let ctx: {
    connection: Connection,
    app: Application,
    transactions: Transaction[],
    req: RequestWithToken,
    spec: SwaggerSpecification,
  };

  // eslint-disable-next-line func-names
  before(async function (): Promise<void> {
    this.timeout(5000);
    const connection = await Database.initialize();
    const app = express();
    const { transactions } = await seedDatabase();
    const req = {
      token: '',
      query: {
        take: 23,
        skip: 0,
      },
    } as any as RequestWithToken;
    ctx = {
      connection,
      app,
      req,
      transactions,
      spec: await Swagger.importSpecification(),
    };
  });

  after(async () => {
    await ctx.connection.close();
  });

  describe('verify transaction', () => {
    const req = {
      from: 0,
      createdBy: 0,
      subtransactions: [
        {
          to: 1,
          container: {
            id: 0,
            revision: 0,
          },
          subTransactionRows: [
            {
              product: {
                id: 0,
                revision: 0,
              },
              amount: 3,
            },
          ],
        },
      ],
      pointOfSale: {
        id: 0,
        revision: 0,
      },
    } as TransactionRequest;
    it('should return true if the transaction request is valid', async () => {
      expect(await TransactionService.verifyTransaction(req)).to.equal(true);
    });
    it('should return false if the point of sale does not exist', async () => {
      // undefined pos
      req.pointOfSale = undefined;
      expect(await TransactionService.verifyTransaction(req)).to.equal(false);

      // non existent pos
      req.pointOfSale = {
        revision: 0,
        id: 12345,
      };
      expect(await TransactionService.verifyTransaction(req)).to.equal(false);
    });
    it('should return false if a specified user does not exist');
  });

  describe('verifiy sub transaction', () => {
    it('should return true if the sub transaction request is valid');
    it('should return false if the container does not exist');
    it('should return false if the to user does not exist');
  });

  describe('verifiy sub transaction row', () => {
    it('should return true if the sub transaction row request is valid');
    it('should return false if the product does not exist');
    it('should return false if the specified amount of products is not greater than 0');
  });

  describe('verifiy balance', () => {
    it('should return true if the balance is sufficient');
    it('should return false if the balance is insuficient');
  });

  describe('Get all transactions', () => {
    it('should return a paginated list', async () => {
      const transactions = await TransactionService.getTransactions(ctx.req, {});

      expect(transactions.length).to.equal(23);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
    });

    it('should filter on fromId', async () => {
      const fromId = 1;
      const transactions = await TransactionService.getTransactions(ctx.req, {
        fromId,
      });

      expect(transactions.length).to.equal(9);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(t.from.id).to.be.equal(fromId));
    });

    it('should filter on createdById', async () => {
      const createdById = 1;
      const transactions = await TransactionService.getTransactions(ctx.req, {
        createdById,
      });

      expect(transactions.length).to.equal(14);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(t.createdBy.id).to.be.equal(createdById));
    });

    it('should filter on toId', async () => {
      const toId = 7;
      const transactions = await TransactionService.getTransactions(ctx.req, {
        toId,
      });
      const transactionIds = ctx.transactions.map((t) => {
        if (t.subTransactions.some((s) => s.to.id === toId)) {
          return t.id;
        }
        return undefined;
      }).filter((i) => i !== undefined);

      expect(transactions.length).to.equal(17);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(transactionIds).to.include(t.id));
    });

    it('should filter on point of sale', async () => {
      const pointOfSale = { id: 14 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        pointOfSaleId: pointOfSale.id,
      });

      expect(transactions.length).to.equal(6);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(t.pointOfSale.id).to.be.equal(pointOfSale.id));
    });

    it('should filter on point of sale with revision', async () => {
      const pointOfSale = { id: 14, revision: 2 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        pointOfSaleId: pointOfSale.id,
        pointOfSaleRevision: pointOfSale.revision,
      });

      expect(transactions.length).to.equal(2);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(t.pointOfSale.id).to.be.equal(pointOfSale.id));
    });

    it('should filter on container', async () => {
      const container = { id: 11 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        containerId: container.id,
      });
      const transactionIds = ctx.transactions.map((t) => {
        if (t.subTransactions.some((s) => s.container.container.id === container.id)) {
          return t.id;
        }
        return undefined;
      }).filter((i) => i !== undefined);

      expect(transactions.length).to.equal(7);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(transactionIds).to.include(t.id));
    });

    it('should filter on container with revision', async () => {
      const container = { id: 11, revision: 2 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        containerId: container.id,
        containerRevision: container.revision,
      });
      const transactionIds = ctx.transactions.map((t) => {
        if (t.subTransactions.some((s) => s.container.container.id === container.id
          && s.container.revision === container.revision)) {
          return t.id;
        }
        return undefined;
      }).filter((i) => i !== undefined);

      expect(transactions.length).to.equal(3);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(transactionIds).to.include(t.id));
    });

    it('should filter on product', async () => {
      const product = { id: 44 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        productId: product.id,
      });
      const transactionIds = ctx.transactions.map((t) => {
        if (t.subTransactions.some((s) => s.subTransactionRows
          .some((r) => r.product.product.id === product.id))
        ) {
          return t.id;
        }
        return undefined;
      }).filter((i) => i !== undefined);

      expect(transactions.length).to.equal(5);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(transactionIds).to.include(t.id));
    });

    it('should filter on product with revision', async () => {
      const product = { id: 44, revision: 2 };
      const transactions = await TransactionService.getTransactions(ctx.req, {
        productId: product.id,
        productRevision: product.revision,
      });
      const transactionIds = ctx.transactions.map((t) => {
        if (t.subTransactions.some((s) => s.subTransactionRows
          .some((r) => r.product.product.id === product.id
            && r.product.revision === product.revision))
        ) {
          return t.id;
        }
        return undefined;
      }).filter((i) => i !== undefined);

      expect(transactions.length).to.equal(2);
      transactions.map((t) => verifyBaseTransactionEntity(ctx.spec, t));
      transactions.map((t) => expect(transactionIds).to.include(t.id));
    });

    it('should return transactions newer than date', async () => {
      let fromDate = new Date(ctx.transactions[0].createdAt.getTime() - 1000 * 60 * 60 * 24);
      let transactions = await TransactionService.getTransactions(ctx.req, {
        fromDate,
      });

      expect(transactions.length).to.equal(23);
      transactions.map((t) => {
        verifyBaseTransactionEntity(ctx.spec, t);
        expect(new Date(t.createdAt)).to.be.greaterThan(fromDate);
        return undefined;
      });

      fromDate = new Date(ctx.transactions[0].createdAt.getTime() + 1000 * 60 * 60 * 24);
      transactions = await TransactionService.getTransactions(ctx.req, {
        fromDate,
      });

      expect(transactions.length).to.equal(0);
    });

    it('should return transactions older than date', async () => {
      let tillDate = new Date(ctx.transactions[0].createdAt.getTime() + 1000 * 60 * 60 * 24);
      console.log(ctx.transactions[0].createdAt.getTime() < tillDate.getTime());
      let transactions = await TransactionService.getTransactions(ctx.req, {
        tillDate,
      });

      expect(transactions.length).to.equal(23);
      transactions.map((t) => {
        verifyBaseTransactionEntity(ctx.spec, t);
        expect(new Date(t.createdAt)).to.be.lessThan(tillDate);
        return undefined;
      });

      tillDate = new Date(ctx.transactions[0].createdAt.getTime() - 1000 * 60 * 60 * 24);
      transactions = await TransactionService.getTransactions(ctx.req, {
        tillDate,
      });

      expect(transactions.length).to.equal(0);
    });
  });
});
