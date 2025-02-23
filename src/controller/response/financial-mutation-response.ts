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

import { PaginationResult } from '../../helpers/pagination';
import { TransferResponse } from './transfer-response';
import { BaseTransactionResponse } from './transaction-response';

/**
 * @typedef FinancialMutationResponse
 * @property {string} type.required - Type of mutation ('transfer' or 'transaction') (Optional)
 * @property {object} mutation - Details of mutation, this can be either of type TransferResponse or BaseTransactionResponse
 */
export interface FinancialMutationResponse {
  type: 'transfer' | 'transaction',
  mutation: TransferResponse | BaseTransactionResponse,
}

/**
 * @typedef PaginatedFinancialMutationResponse
 * @property {PaginationResult.model} _pagination.required - Pagination metadata
 * @property {Array.<FinancialMutationResponse>} records.required - Returned mutations
 */
export interface PaginatedFinancialMutationResponse {
  _pagination: PaginationResult,
  records: FinancialMutationResponse[],
}
