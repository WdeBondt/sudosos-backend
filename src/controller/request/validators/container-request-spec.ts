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
import Product from '../../../entity/product/product';
import { INVALID_PRODUCT_ID } from './validation-errors';
import Validator from 'swagger-model-validator';
import User, { UserType } from '../../../entity/user/user';

async function validProductIds(name: string, value: number[]) {
  const errors: Error[] = [];
  console.error("ERRORS");

  await Promise.all(value.map(async (id: number) => {
    const product = await Product.findOne({ where: { id } });
    if (!product) errors.push(INVALID_PRODUCT_ID(id));
    return null;
  }));

  return errors.length > 0 ? errors : null;
}

function nonZeroString(name: string, value: string) {
  if (value === '') {
    return new Error('must be a non-zero length string.');
  }
  return null;
}

async function ownerIsOrgan(name: string, value: number): Promise<Error> {
  const owner = await User.findOne({ where: { id: value, deleted: false, type: UserType.ORGAN } });
  if (!owner) return new Error('Owner must be of type ORGAN.');
  return null;
}


function baseContainerValidators(validator: Validator) {
  validator.addFieldValidator('ContainerParams', 'name', nonZeroString);
  validator.addFieldValidator('ContainerParams', 'products', validProductIds);
}

function createContainerValidators(validator: Validator) {
  validator.addFieldValidator('CreateContainerRequest', 'name', nonZeroString);
  validator.addFieldValidator('CreateContainerRequest', 'products', validProductIds);
  validator.addFieldValidator('CreateContainerRequest', 'ownerId', ownerIsOrgan);
}


export function addContainerRequestValidators(validator: Validator) {
  console.error("added");
  baseContainerValidators(validator);
  createContainerValidators(validator);
}
