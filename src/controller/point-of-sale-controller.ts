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
import log4js, { Logger } from 'log4js';
import { Response } from 'express';
import BaseController, { BaseControllerOptions } from './base-controller';
import Policy from './policy';
import { RequestWithToken } from '../middleware/token-middleware';
import PointOfSaleService from '../service/point-of-sale-service';

export default class PointOfSaleController extends BaseController {
  private logger: Logger = log4js.getLogger('PointOfSaleController');

  /**
   * Creates a new point of sale controller instance.
   * @param options - The options passed to the base controller.
   */
  public constructor(options: BaseControllerOptions) {
    super(options);
    this.logger.level = process.env.LOG_LEVEL;
  }

  /**
   * @inheritDoc
   */
  getPolicy(): Policy {
    return {
      '/': {
        GET: {
          policy: async (req) => this.roleManager.can(req.token.roles, 'get', 'all', 'PointOfSale', ['*']),
          handler: this.returnAllPointOfSales.bind(this),
        },
      },
    };
  }

  /**
   * Returns all existing Point of Sales
   * @route GET /pointofsales
   * @group pointofsale - Operations of the point of sale controller
   * @security JWT
   * @returns {Array<PointOfSaleResponse>} 200 - All existing point of sales
   * @returns {string} 500 - Internal server error
   */
  public async returnAllPointOfSales(req: RequestWithToken, res: Response): Promise<void> {
    const { body } = req;
    this.logger.trace('Get all point of sales', body, 'by user', req.token.user);

    // Handle request
    try {
      const pointsOfSale = await PointOfSaleService.getPointOfSales();
      res.json(pointsOfSale);
    } catch (error) {
      this.logger.error('Could not return all point of sales:', error);
      res.status(500).json('Internal server error.');
    }
  }
}
