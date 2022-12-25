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

import dinero, { Dinero } from 'dinero.js';
import {
  Between,
  FindManyOptions,
  FindOperator,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,

} from 'typeorm';
import Transfer from '../entity/transactions/transfer';
import {
  AggregatedTransferResponse,
  PaginatedTransferResponse,
  TransferResponse,
} from '../controller/response/transfer-response';
import TransferRequest from '../controller/request/transfer-request';
import User from '../entity/user/user';
import QueryFilter, { FilterMapping } from '../helpers/query-filter';
import { PaginationParameters } from '../helpers/pagination';
import { RequestWithToken } from '../middleware/token-middleware';
import { asBoolean, asDate, asNumber } from '../helpers/validators';
import { parseUserToBaseResponse } from '../helpers/revision-to-response';
import InvoiceService from './invoice-service';
import StripeService from './stripe-service';
import PayoutRequestService from './payout-request-service';
import { DineroObjectResponse } from '../controller/response/dinero-response';
import { toMySQLString } from '../helpers/timestamps';

export interface TransferFilterParameters {
  id?: number;
  createdById?: number,
  fromId?: number,
  toId?: number,
  fromDate?: Date,
  tillDate?: Date,
  hasInvoice?: { id: FindOperator<any> },
  hasDeposit?: { id: FindOperator<any> },
  hasPayout?: { id: FindOperator<any> },
}

export interface TransferAggregationParameters {
  fromDate?: Date,
  tillDate?: Date,
  isInvoice?: boolean,
  isDeposit?: boolean,
  isPayout?: boolean,
}

export function parseGetTransferFilters(req: RequestWithToken): TransferFilterParameters {
  const filters: TransferFilterParameters = {
    id: asNumber(req.query.id),
    createdById: asNumber(req.query.id),
    fromId: asNumber(req.query.id),
    toId: asNumber(req.query.id),
    hasInvoice: req.query.hasInvoice ? { id: Not(IsNull()) } : undefined,
    hasDeposit: req.query.hasDeposit ? { id: Not(IsNull()) }  : undefined,
    hasPayout: req.query.hasPayout ? { id: Not(IsNull()) }  : undefined,
  };
  return filters;
}

export function parseAggregateTransferParameters(req: RequestWithToken): TransferAggregationParameters {
  return {
    fromDate: asDate(req.query.fromDate),
    tillDate: asDate(req.query.tillDate),
    isInvoice: req.query.isInvoice ? asBoolean(req.query.isInvoice) : false,
    isDeposit: req.query.isDeposit ? asBoolean(req.query.isDeposit) : false,
    isPayout: req.query.isPayout ? asBoolean(req.query.isPayout) : false,
  };
}

export default class TransferService {
  public static asTransferResponse(transfer: Transfer) : TransferResponse {
    return {
      amount: transfer.amount.toObject(),
      from: parseUserToBaseResponse(transfer.from, false),
      to: parseUserToBaseResponse(transfer.to, false),
      id: transfer.id,
      description: transfer.description,
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
      invoice: transfer.invoice ? InvoiceService.asInvoiceResponse(transfer.invoice) : null,
      deposit: transfer.deposit ? StripeService.asStripeDepositResponse(transfer.deposit) : null,
      payoutRequest: transfer.payoutRequest ? PayoutRequestService.asBasePayoutRequestResponse(transfer.payoutRequest) : null,
    };
  }

  public static async createTransfer(request: TransferRequest) : Promise<Transfer> {
    const transfer = Object.assign(new Transfer(), {
      description: request.description,
      amount: dinero(request.amount as Dinero.Options),
      from: request.fromId ? await User.findOne({ where: { id: request.fromId } }) : undefined,
      to: request.toId ? await User.findOne({ where: { id: request.toId } }) : undefined,
    });

    await transfer.save();
    return transfer;
  }

  /**
   * Query to return transfers from the database
   * @param filters - Parameters to query the transfers with
   * @param pagination
   * @param user
   */
  public static async getTransfers(filters: TransferFilterParameters = {},
    pagination: PaginationParameters = {}, user?: User)
    : Promise<PaginatedTransferResponse> {
    const { take, skip } = pagination;
    const {
      fromDate, tillDate, ...p
    } = filters;

    const filterMapping: FilterMapping = {
      id: 'id',
      fromId: 'fromId',
      toId: 'toId',
      type: 'type',
      hasInvoice: 'invoice',
      hasDeposit: 'deposit',
      hasPayout: 'payoutRequest',
    };

    let whereClause = QueryFilter.createFilterWhereClause(filterMapping, p);
    let whereOptions: FindOptionsWhere<Transfer> | FindOptionsWhere<Transfer>[] = [];

    // Filter on time.
    if (fromDate && tillDate) {
      whereClause = { ...whereClause, createdAt: Between(toMySQLString(fromDate), toMySQLString(tillDate)) };
    } else if (fromDate) {
      whereClause = { ...whereClause, createdAt: MoreThanOrEqual(toMySQLString(fromDate)) };
    } else if (tillDate) {
      whereClause = { ...whereClause, createdAt: LessThanOrEqual(toMySQLString(tillDate)) };
    }


    // Apparently this is how you make an ancreatedAtd-or clause in typeorm without a query builder.
    if (user) {
      whereOptions = [{
        fromId: user.id,
        ...whereClause,
      }, {
        toId: user.id,
        ...whereClause,
      }];
    } else {
      whereOptions = whereClause;
    }

    const options: FindManyOptions = {
      where: whereOptions,
      relations: ['from', 'to',
        'invoice', 'invoice.invoiceStatus',
        'deposit', 'deposit.depositStatus',
        'payoutRequest', 'payoutRequest.payoutRequestStatus'],
      take,
      skip,
      order: { createdAt: 'DESC' },
    };

    const results = await Promise.all([
      Transfer.find(options),
      Transfer.count(options),
    ]);

    const records = results[0].map((rawTransfer) => this.asTransferResponse(rawTransfer));
    return {
      _pagination: {
        take, skip, count: results[1],
      },
      records,
    };
  }

  public static async getAggregatedTransfers(params: TransferAggregationParameters): Promise<AggregatedTransferResponse> {
    const filters: TransferFilterParameters = {
      tillDate: params.tillDate,
      fromDate: params.fromDate,
      // Only Not(IsNull()) does not seem to work. Most likely a bug with TypeORM.
      hasInvoice: params.isInvoice ? { id: Not(IsNull()) } : undefined,
      hasDeposit: params.isDeposit ? { id: Not(IsNull()) }  : undefined,
      hasPayout: params.isPayout ? { id: Not(IsNull()) }  : undefined,
    };

    const transfers: TransferResponse[] = (await this.getTransfers(filters)).records;
    let total = 0;
    const count = transfers.length;

    transfers.forEach((t) => {
      total += t.amount.amount;
    });
    const sum = dinero({ amount: total }).toObject() as DineroObjectResponse;

    return {
      sum, count, params,
    };
  }

  public static async postTransfer(request: TransferRequest) : Promise<TransferResponse> {
    const transfer = await this.createTransfer(request);
    return this.asTransferResponse(transfer);
  }

  public static async verifyTransferRequest(request: TransferRequest) : Promise<boolean> {
    // the type of the request should be in TransferType enums
    // if the type is custom a description is necessary
    // a transfer is always at least from a valid user OR to a valid user
    // a transfer may be from null to an user, or from an user to null
    return (request.fromId || request.toId)
        && (await User.findOne({ where: { id: request.fromId } })
        || await User.findOne({ where: { id: request.toId } }))
        && request.amount.precision === dinero.defaultPrecision
        && request.amount.currency === dinero.defaultCurrency;
  }
}
