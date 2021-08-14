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
import { Connection, FindManyOptions } from 'typeorm';
import express, { Application } from 'express';
import { request, expect } from 'chai';
import { SwaggerSpecification } from 'swagger-model-validator';
import { json } from 'body-parser';
import User, { UserType } from '../../../src/entity/user/user';
import Database from '../../../src/database/database';
import { seedAllContainers, seedAllProducts, seedProductCategories } from '../../seed';
import TokenHandler from '../../../src/authentication/token-handler';
import Swagger from '../../../src/start/swagger';
import RoleManager from '../../../src/rbac/role-manager';
import TokenMiddleware from '../../../src/middleware/token-middleware';
import ContainerRequest from '../../../src/controller/request/container-request';
import ContainerController from '../../../src/controller/container-controller';
import Container from '../../../src/entity/container/container';
import { ContainerResponse, ContainerWithProductsResponse } from '../../../src/controller/response/container-response';
import { ProductResponse } from '../../../src/controller/response/product-response';
import UpdatedContainer from '../../../src/entity/container/updated-container';

/**
 * Tests if a container response is equal to the request.
 * @param source - The source from which the container was created.
 * @param response - The received container.
 * @return true if the source and response describe the same product.
 */
function containerEq(source: ContainerRequest, response: ContainerResponse) {
  return source.name === response.name
      && source.public == response.public;
}

describe('ContainerController', async (): Promise<void> => {
  let ctx: {
    connection: Connection,
    app: Application,
    specification: SwaggerSpecification,
    controller: ContainerController,
    adminUser: User,
    localUser: User,
    adminToken: String,
    token: String,
    validContainerReq: ContainerRequest,
    invalidContainerReq: ContainerRequest,
  };

  // Initialize context
  before(async () => {
    // initialize test database
    const connection = await Database.initialize();

    // create dummy users
    const adminUser = {
      id: 1,
      firstName: 'Admin',
      type: UserType.LOCAL_ADMIN,
      active: true,
    } as User;

    const localUser = {
      id: 2,
      firstName: 'User',
      type: UserType.MEMBER,
      active: true,
    } as User;

    await User.save(adminUser);
    await User.save(localUser);

    const categories = await seedProductCategories();
    const { products, productRevisions } = (
      await seedAllProducts([adminUser, localUser], categories));
    await seedAllContainers([adminUser, localUser], productRevisions, products);

    // create bearer tokens
    const tokenHandler = new TokenHandler({
      algorithm: 'HS256', publicKey: 'test', privateKey: 'test', expiry: 3600,
    });
    const adminToken = await tokenHandler.signToken({ user: adminUser, roles: ['Admin'] }, 'nonce admin');
    const token = await tokenHandler.signToken({ user: localUser, roles: ['User'] }, 'nonce');

    const validContainerReq: ContainerRequest = {
      products: [7, 8],
      public: true,
      name: 'Valid container',
    };

    const invalidContainerReq: ContainerRequest = {
      ...validContainerReq,
      name: '',
      products: [-1],
    };

    // start app
    const app = express();
    const specification = await Swagger.initialize(app);

    const all = { all: new Set<string>(['*']) };
    const own = { own: new Set<string>(['*']) };

    const roleManager = new RoleManager();
    roleManager.registerRole({
      name: 'Admin',
      permissions: {
        Container: {
          create: all,
          get: all,
          update: all,
          delete: all,
        },
      },
      assignmentCheck: async (user: User) => user.type === UserType.LOCAL_ADMIN,
    });

    roleManager.registerRole({
      name: 'User',
      permissions: {
        Container: {
          create: own,
          get: own,
          update: own,
          delete: own,
        },
      },
      assignmentCheck: async (user: User) => user.type === UserType.MEMBER,
    });

    const controller = new ContainerController({ specification, roleManager });
    app.use(json());
    app.use(new TokenMiddleware({ tokenHandler, refreshFactor: 0.5 }).getMiddleware());
    app.use('/containers', controller.getRouter());

    // initialize context
    ctx = {
      connection,
      app,
      specification,
      controller,
      adminUser,
      localUser,
      adminToken,
      token,
      validContainerReq,
      invalidContainerReq,
    };
  });

  // close database connection
  after(async () => {
    await ctx.connection.close();
  });

  describe('GET /containers', () => {
    it('should return an HTTP 200 and all existing containers in the database if admin', async () => {
      const res = await request(ctx.app)
        .get('/containers')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(res.status).to.equal(200);

      // Every container that has a current revision should be returned.
      const activeContainerCount = await Container.count({ where: 'currentRevision' } as FindManyOptions);
      expect((res.body as ContainerResponse[]).length).to.equal(activeContainerCount);
    });
    it('should return an HTTP 200 and own containers or public if not admin', async () => {
      const res = await request(ctx.app)
        .get('/containers')
        .set('Authorization', `Bearer ${ctx.token}`);

      // Every container that has a current revision should be returned.
      const publicContainerCount = await Container.count({ where: 'currentRevision AND public = 1' } as FindManyOptions);
      const ownPriviteContainerCount = await Container.count({ where: 'currentRevision AND ownerId = 2 AND public = 0' } as FindManyOptions);

      expect(res.status).to.equal(200);

      // forbidden code
      expect((res.body as ContainerResponse[]).length)
        .to.equal(publicContainerCount + ownPriviteContainerCount);
    });
  });
  describe('GET /containers/:id', () => {
    it('should return an HTTP 200 and the product with the given id if admin', async () => {
      const res = await request(ctx.app)
        .get('/containers/1')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect((res.body as ContainerResponse).id).to.equal(1);

      // success code
      expect(res.status).to.equal(200);
    });
    it('should return an HTTP 200 and the container if the container is public and not admin', async () => {
      const res = await request(ctx.app)
        .get('/containers/3')
        .set('Authorization', `Bearer ${ctx.token}`);

      expect((res.body as ContainerResponse).public).to.equal(1);
      expect((res.body as ContainerResponse).id).to.equal(3);

      // success code
      expect(res.status).to.equal(200);
    });
    it('should return an HTTP 200 and the container if the container is not public but the user is the owner', async () => {
      const res = await request(ctx.app)
        .get('/containers/8')
        .set('Authorization', `Bearer ${ctx.token}`);

      expect((res.body as ContainerResponse).public).to.equal(0);
      expect((res.body as ContainerResponse).owner.id).to.equal(ctx.localUser.id);
      expect((res.body as ContainerResponse).id).to.equal(8);

      // success code
      expect(res.status).to.equal(200);
    });
    it('should return an HTTP 403 if the container exist but is not visible to the user', async () => {
      const id = 2;
      const test = await request(ctx.app)
        .get(`/containers/${id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect((test.body as ContainerResponse).public).to.equal(0);
      expect((test.body as ContainerResponse).owner.id).to.not.equal(ctx.localUser.id);
      expect((test.body as ContainerResponse).id).to.equal(id);

      const res = await request(ctx.app)
        .get(`/containers/${id}`)
        .set('Authorization', `Bearer ${ctx.token}`);

      // success code
      expect(res.status).to.equal(403);
    });
    it('should return an HTTP 404 if the containerId does not exist', async () => {
      const id = (await Container.count()) + 10;
      const res = await request(ctx.app)
        .get(`/containers/${id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      // check if banner is not returned
      expect(res.body).to.equal('Container not found.');

      // success code
      expect(res.status).to.equal(404);
    });
  });
  describe('GET /containers/:id/products', () => {
    it('should return an HTTP 200 and all the products in the container if admin', async () => {
      const res = await request(ctx.app)
        .get('/containers/1/products')
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect((res.body as ProductResponse[])).to.not.empty;
      expect(res.status).to.equal(200);
    });
    it('should return an HTTP 403 if container not public or own and if not admin', async () => {
      const containerId = 2;
      const container = await request(ctx.app)
        .get(`/containers/${containerId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      // Sanity check
      expect((container.body as ContainerResponse).public).to.equal(0);
      expect((container.body as ContainerResponse).owner.id).to.not.equal(ctx.localUser.id);

      const res = await request(ctx.app)
        .get(`/containers/${containerId}/products`)
        .set('Authorization', `Bearer ${ctx.token}`);

      expect(res.status).to.equal(403);
      expect(res.body).to.be.equal('Incorrect permissions to get container.');
    });
    it('should return an HTTP 200 and all the products in the container is public and if not admin', async () => {
      const containerId = 1;
      const container = await request(ctx.app)
        .get(`/containers/${containerId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      // Sanity check
      expect((container.body as ContainerResponse).public).to.equal(1);
      expect((container.body as ContainerResponse).owner.id).to.not.equal(ctx.localUser.id);

      const res = await request(ctx.app)
        .get(`/containers/${containerId}/products`)
        .set('Authorization', `Bearer ${ctx.token}`);

      expect(res.status).to.equal(200);
    });
  });
  describe('POST /containers', () => {
    it('should store the given container in the database and return an HTTP 200 and the created container if admin', async () => {
      const containerCount = await Container.count();
      const res = await request(ctx.app)
        .post('/containers')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send(ctx.validContainerReq);

      expect(await Container.count()).to.equal(containerCount + 1);
      expect(containerEq(ctx.validContainerReq, res.body as ContainerResponse)).to.be.true;

      const databaseProduct = await UpdatedContainer.findOne((res.body as ContainerResponse).id);
      expect(databaseProduct).to.exist;

      expect(res.status).to.equal(200);
    });
    it('should return an HTTP 400 if the given product is invalid', async () => {
      const containerCounter = await Container.count();
      const res = await request(ctx.app)
        .post('/containers')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send(ctx.invalidContainerReq);

      expect(await Container.count()).to.equal(containerCounter);
      expect(res.body).to.equal('Invalid container.');

      expect(res.status).to.equal(400);
    });
    it('should return an HTTP 403 if not admin', async () => {
      const containerCount = await Container.count();
      const res = await request(ctx.app)
        .post('/containers')
        .set('Authorization', `Bearer ${ctx.token}`)
        .send(ctx.validContainerReq);

      expect(await Container.count()).to.equal(containerCount);
      expect(res.body).to.be.empty;

      expect(res.status).to.equal(403);
    });
  });
  describe('POST /containers/:id/approve', () => {
    it('should approve the container update if it exists and admin', async () => {
      const newContainer = await request(ctx.app)
        .post('/containers')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send(ctx.validContainerReq);

      const { id } = newContainer.body;

      // sanity check / precondition
      expect(await UpdatedContainer.findOne(id)).to.exist;

      const res = await request(ctx.app)
        .post(`/containers/${id}/approve`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      // sanity check
      expect(await UpdatedContainer.findOne(id)).to.be.undefined;

      const latest = await request(ctx.app)
        .get(`/containers/${id}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      expect(latest.body).to.deep.equal(res.body);
      expect(res.status).to.equal(200);
    });
  });
});
