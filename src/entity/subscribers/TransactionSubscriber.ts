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
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import Transaction from '../transactions/transaction';
import TransactionService from "../../service/transaction-service";

@EventSubscriber()
export class TransactionSubscriber implements EntitySubscriberInterface {

  listenTo() {
    return Transaction;
  }

  async afterInsert(event: InsertEvent<Transaction>): Promise<any | void> {
    console.error('AFTER POST INSERTED: ', await TransactionService.asTransactionResponse(event.entity));
  }

  beforeUpdate(event: UpdateEvent<Transaction>): Promise<any> | void {
    console.error('BEFORE POST UPDATE: ', event.entity);
  }
}
