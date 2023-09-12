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

import { Connection } from 'typeorm';
import express, { Application } from 'express';
import { SwaggerSpecification } from 'swagger-model-validator';
import User from '../../../src/entity/user/user';
import ProductInContainer from '../../../src/entity/container/product-in-container';
import Database from '../../../src/database/database';
import {
  seedAllContainers,
  seedAllProducts,
  seedPointsOfSale,
  seedProductCategories, seedProductInContainer,
  seedUsers,
  seedVatGroups,
} from '../../seed';
import Swagger from '../../../src/start/swagger';
import { json } from 'body-parser';
import Container from '../../../src/entity/container/container';
import UpdatedContainer from '../../../src/entity/container/updated-container';
import ProductOrderingService from '../../../src/service/product-ordering-service';
import { expect } from 'chai';



describe('ProductOrderingService', async (): Promise<void> => {

  let ctx: {
    connection: Connection,
    app: Application,
    specification: SwaggerSpecification,
    users: User[],
    containers: Container[],
    updatedContainers: UpdatedContainer[],
    productInContainer: ProductInContainer[]
  };

  before(async () => {
    const connection = await Database.initialize();

    const users = await seedUsers();
    const categories = await seedProductCategories();
    const vatGroups = await seedVatGroups();
    const {
      products,
      productRevisions,
    } = await seedAllProducts(users, categories, vatGroups);
    const {
      containers,
      containerRevisions,
      updatedContainers,
    } = await seedAllContainers(users, productRevisions, products);
    const { productInContainer } = await seedProductInContainer(containerRevisions);
    await seedPointsOfSale(users, containerRevisions);

    // start app
    const app = express();
    const specification = await Swagger.initialize(app);
    app.use(json());

    // initialize context
    ctx = {
      connection,
      app,
      specification,
      users,
      containers,
      updatedContainers,
      productInContainer,
    };
  });

  // close database connection
  after(async () => {
    await ctx.connection.dropDatabase();
    await ctx.connection.close();
  });

  describe('getProductOrdering function', () => {
    it('should return a specific product ordering', async () => {
      const { records } = await ProductOrderingService.getProductOrdering({ containerId: ctx.productInContainer[0].containerId });

      expect(records).to.be.length(3);
      expect(records[0].containerId).to.be.equal(ctx.productInContainer[0].containerId);
      expect(records[0].productId).to.be.equal(ctx.productInContainer[0].productId);
      expect(records[0].featured).to.be.equal(ctx.productInContainer[0].featured);
      expect(records[0].preferred).to.be.equal(ctx.productInContainer[0].preferred);
    });


  });
});