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
import { PaginationParameters } from '../helpers/pagination';
import { PaginatedUserResponse, UserResponse } from '../controller/response/user-response';
import User, { UserType } from '../entity/user/user';
import { RequestWithToken } from '../middleware/token-middleware';
import {asBoolean, asNumber, asString} from "../helpers/validators";

export interface UserFilterParameters {
  firstName?: string,
  lastName?: string,
  active?: boolean,
  deleted?: boolean,
  userType?: UserType,
  id?: number,
}

export function parseGetUserFilters(req: RequestWithToken) {
  const filters: UserFilterParameters = {
    firstName: asString(req.query.firstName),
    lastName: asString(req.query.lastName),
    active: asBoolean(req.query.active),
    deleted: asBoolean(req.query.deleted),
    userType: UserType[req.query.userType as keyof typeof UserType],
    id: asNumber(req.query.id),
  };

  return filters;
}

export default class UserService {
  static toUserResponse(user: User): UserResponse {
    return {
      active: user.active,
      createdAt: user.createdAt.toISOString(),
      deleted: user.deleted,
      firstName: user.firstName,
      id: user.id,
      lastName: user.lastName,
      type: user.type,
      updatedAt: user.updatedAt.toISOString(),

    };
  }

  /**
   *
   */
  public static async getUsers(params: UserFilterParameters = { deleted: false },
    pagination: PaginationParameters = {}): Promise<PaginatedUserResponse> {
    const { take, skip } = pagination;

    const results = await Promise.all([
      User.find({ where: params, take, skip }),
      User.count({ where: params }),
    ]);

    const records = results[0].map((u) => this.toUserResponse(u));

    return {
      _pagination: {
        take, skip, count: results[1],
      },
      records,
    };
  }
}
