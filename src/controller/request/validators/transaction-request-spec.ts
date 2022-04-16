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
import {
  Specification,
  validateSpecification,
  ValidationError,
} from '../../../helpers/specification-validation';
import { SubTransactionRequest, SubTransactionRowRequest, TransactionRequest } from '../transaction-request';
import { activeUserMustExist, userMustExist } from './general-validators';

// subtransaction row
function subTransactionRowRequestSpec<T extends SubTransactionRowRequest>():
Specification<T, ValidationError> {
  return [
    [[], 'product', new ValidationError('From:')],
    [[], 'amount', new ValidationError('Amount:')],
    [[], 'price', new ValidationError('Price:')],
  ];
}

// subtransaction
function subTransactionRequestSpec<T extends SubTransactionRequest>():
Specification<T, ValidationError> {
  return [
    [[userMustExist], 'to', new ValidationError('From:')],
    [[], 'container', new ValidationError('Container:')],
    [[], 'subTransactionRows', new ValidationError('Subtransaction rows:')],
    [[], 'price', new ValidationError('Price:')],
  ];
}

// transaction
function transactionRequestSpec<T extends TransactionRequest>():
Specification<T, ValidationError> {
  return [
    [[userMustExist], 'from', new ValidationError('From:')],
    [[activeUserMustExist], 'createdBy', new ValidationError('Created by:')],
    [[], 'subTransactions', new ValidationError('Subtransactions:')],
    [[], 'pointOfSale', new ValidationError('Point of sale:')],
    [[], 'price', new ValidationError('Price:')],
  ];
}

// verification rules for transaction request
export default async function verifyTransactionRequest(req: TransactionRequest) {
  return Promise.resolve(await validateSpecification(
    req, transactionRequestSpec(),
  ));
}
