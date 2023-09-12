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
import BaseController, { BaseControllerOptions } from './base-controller';
import Policy from './policy';
import log4js, { Logger } from 'log4js';
import { RequestWithToken } from '../middleware/token-middleware';
import ProductInContainer from '../entity/container/product-in-container';
import ProductOrderingService from '../service/product-ordering-service';
import { asNumber } from '../helpers/validators';
import Container from '../entity/container/container';
import userTokenInOrgan from '../helpers/token-helper';
import ContainerService from '../service/container-service';
import { Response } from 'express';


export default class ProductOrderingController extends BaseController {
  private logger: Logger = log4js.getLogger('ProductOrderingController');

  /**
     * Creates a new product controller instance.
     * @param options - The options passed to the base controller.
     */
  public constructor(options: BaseControllerOptions) {
    super(options);
    this.logger.level = process.env.LOG_LEVEL;
  }

  /**
     * @inheritdoc
     */
  getPolicy(): Policy {
    return {
      '/:id(\\d+)': {
        GET: {
          policy: async (req) => this.roleManager.can(req.token.roles, 'get', await ProductOrderingController.getRelation(req), 'ProductInContainer', ['*']),
          handler: this.getProductOrdering.bind(this),
        },
      },
    };


  }

  /**
     * Returns a specific product ordering
     * @route GET /productOrdering
     * @operationId getProductOrdering
     * @group productOrdering - Operation of product ordering controller
     * @security JWT
     * @param   {integer} id.path.required - The id of the container that we want an ordering from
     * @returns {ContainerWithProductsResponse.model} 200 - The requested container
     * @returns {string} 404 - Not found error
     * @returns {string} 403 - Incorrect permissions
     * @returns {string} 500 - Internal server error
     */
  public async getProductOrdering(req: RequestWithToken, res: Response): Promise<void> {
    const { id } = req.params;
    this.logger.trace('Get product ordering', id, 'by user', req.token.user);

    const containerId = parseInt(id, 10);

    // Handle request
    try {
      // Check if we should return a 404
      const exist = await ProductInContainer.find({ where: { containerId: containerId } });
      if (!exist) {
        res.status(404).json('Container not found.');
        return;
      }

      const productInContainer = (await ProductOrderingService
        .getProductOrdering({ containerId })).records[0];
      res.json(productInContainer);
    } catch (error) {
      this.logger.error('Could not return a product ordering:', error);
      res.status(500).json('Internal server error.');
    }
  }

  /**
     * Function to determine which credentials are needed to get product ordering
     *          'all' if user is not connected to container
     *          'organ' if user is not connected to container via organ
     *          'own' if user is connected to container
     * @param req
     * @returns whether container is connected to used token
     */
  static async getRelation(req: RequestWithToken): Promise<string> {
    const containerId = asNumber(req.params.id);
    const container: Container = await Container.findOne({ where: { id: containerId }, relations: ['owner'] });

    if (!container) return 'all';
    if (userTokenInOrgan(req, container.owner.id)) return 'organ';

    const containerVisibility = await ContainerService.canViewContainer(
      req.token.user.id, container,
    );
    if (containerVisibility.own) return 'own';
    if (containerVisibility.public) return 'public';
    return 'all';
  }

}