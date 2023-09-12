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
  Column,
  Entity, JoinColumn, ManyToOne, PrimaryColumn,
} from 'typeorm';
import ContainerRevision from './container-revision';
import { BaseEntity as OrmBaseEntity } from 'typeorm/repository/BaseEntity';

/**
 * @typedef {BaseEntity} ProductInContainer
 * @property {ContainerRevision.model} containerRevision.required - The container revision this ordering belongs to.
 * @property {integer} productId.required - The product id this ordering belongs to
 * @property {integer} containerId.required -The container id this ordering belongs to.
 * @property {integer} containerRevisionNumber.required - The container revision this ordering belongs to.
 */

@Entity('product_in_container')
export default class ProductInContainer extends OrmBaseEntity {

  @PrimaryColumn()
  public  readonly productId: number;

  @PrimaryColumn()
  public readonly containerId: number;

  @ManyToOne(() => ContainerRevision, (containerRevision) => containerRevision.productInContainer)
  @JoinColumn([
    { name: 'containerId', referencedColumnName: 'containerId' },
    { name: 'containerRevisionNumber', referencedColumnName: 'revision' },
  ])
  public containerRevision: ContainerRevision;

  @Column({ default: false })
  public featured: boolean;

  @Column({ default: false })
  public preferred: boolean;
}