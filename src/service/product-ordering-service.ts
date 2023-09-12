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
import ProductInContainer from '../entity/container/product-in-container';
import { createQueryBuilder, SelectQueryBuilder } from 'typeorm';
import { PaginationParameters } from '../helpers/pagination';
import {
  PaginatedProductOrderingResponse,
  BaseProductOrderingResponse,
} from '../controller/response/product-ordering-response';
import { CreateProductOrderingParams } from '../controller/request/product-ordering-request';
import ContainerRevision from '../entity/container/container-revision';
import { create } from 'domain';
import Container from '../entity/container/container';

/**
 * Define product ordering filtering parameters used to filter query results.
 */
export interface ProductOrderingParameters {
  /**
   * Filter based on container id
   */
  containerId?: number;
}
export default class ProductOrderingService {

  private static asProductOrderingResponse(rawProductOrdering: any): BaseProductOrderingResponse {
    return {
      containerId: rawProductOrdering.containerId,
      productId: rawProductOrdering.productId,
      featured: rawProductOrdering.featured,
      preferred: rawProductOrdering.preferred,
    };
  }

  private static async buildGetProductOrderingQuery(filters: ProductOrderingParameters = {})
    : Promise<SelectQueryBuilder<ProductInContainer>> {
    const { containerId } = filters;

    const selection = [
      'productincontainer.containerId AS container_id',
      'productincontainer.productId AS product_id',
      'productincontainer.featured AS featured',
      'productincontainer.preferred AS preferred',
    ];

    const builder = createQueryBuilder()
      .from(ProductInContainer, 'productincontainer')
      .select(selection);


    if (containerId !== undefined) {
      builder.where(`productincontainer.containerId = ${containerId}`);
    }

    builder.orderBy({ 'productincontainer.productId': 'ASC' });

    return builder;
  }

  /**
   * Converts the 0 and 1 from the database back to boolean values
   * @param rawResponse
   *
   */
  private static async booleanConverter(rawResponse: any[])
    : Promise<BaseProductOrderingResponse[]> {
    const collected: BaseProductOrderingResponse[] = [];
    rawResponse.forEach((response) => {
      const rawOrdering = {
        containerId: response.container_id,
        productId: response.product_id,
        featured: false,
        preferred: false,
      };

      if (response.featured == 1) {
        rawOrdering.featured = true;
      }
      if (response.preferred == 1) {
        rawOrdering.preferred = true;
      }

      const productOrderingResponse: BaseProductOrderingResponse = this.asProductOrderingResponse(rawOrdering);

      collected.push(productOrderingResponse);
    });


    return collected;
  }

  public static async getProductOrdering(filters: ProductOrderingParameters = {}, pagination: PaginationParameters = {})
    : Promise<PaginatedProductOrderingResponse> {
    const { take, skip } = pagination;

    const results = await Promise.all([
      (await this.buildGetProductOrderingQuery(filters)).limit(take).offset(skip).getRawMany(),
      (await this.buildGetProductOrderingQuery(filters)).getCount(),
    ]);
    
    let records;
    records = await this.booleanConverter(results[0]);

    return {
      _pagination: {
        take, skip, count: results[1],
      },
      records,
    };
  }

  private static async buildCreateProductOrdering(filter: CreateProductOrderingParams)
    : Promise<SelectQueryBuilder<ContainerRevision>> {
    const containerId = filter.containerId;
    const selection = [
      'container.id AS container_id',
      'containerrevision.revision AS container_revision',
      'containerrevision.products AS products',
    ];

    const builder = createQueryBuilder()
      .from(ContainerRevision, 'container')
      .innerJoin(
        Container,
        'container',
        'container.id = containerrevision.container',
      )
      .where(`container.id = ${containerId}`)
      .select(selection);

    builder.orderBy({ 'container.id': 'DESC' });

    return builder;
  }




  /**
   * Create a new product ordering for a container for which this does not exist
   * @param productOrdering
   */
  public static async createProductOrdering(productOrdering: CreateProductOrderingParams)
    : Promise<BaseProductOrderingResponse[]> {
    const result = (await this.buildCreateProductOrdering(productOrdering)).getRawMany();



  }
}