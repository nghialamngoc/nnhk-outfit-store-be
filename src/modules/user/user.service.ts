import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import {
  CreateUserInputDTO,
  GetUsersInputDTO,
  UpdateUserInputDTO,
} from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(input: CreateUserInputDTO) {
    try {
      this.logger.log(`create user with input: ${JSON.stringify(input)}`);
      const { email, password } = input;

      const existingUser = await this.userModel.findOne({
        email,
      });
      if (existingUser) {
        throw new BadRequestException(`email already exists`);
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password!, saltRounds);

      const createdUser = new this.userModel({
        ...input,
        password: hashedPassword,
        name: input.name ?? email.split('@')[0],
      });

      const savedUser = await createdUser.save();

      this.logger.log(`Created product with ID: ${savedUser.id}`);

      return savedUser.toObject();
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async getUserById(id: string) {
    this.logger.log(`Fetching user with input: ${JSON.stringify(id)}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const result = await this.userModel.findById(id);

      if (!result) {
        throw new BadRequestException(`Not found user with id: ${id}`);
      }

      return result.toObject();
    } catch (error) {
      this.logger.error(`Failed to get user: ${error.message}`);
      throw new BadRequestException(`Failed to get user: ${error.message}`);
    }
  }

  async update(input: UpdateUserInputDTO) {
    try {
      this.logger.log(`update user with input: ${JSON.stringify(input)}`);

      const { id, email } = input;

      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const existingUser = await this.userModel.findOne({
        email,
        _id: { $ne: id },
      });
      if (existingUser) {
        throw new BadRequestException(`email already exists`);
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(id, input, {
        new: true,
        runValidators: true,
      });

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return updatedUser.toObject();
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  async getUsers(input: GetUsersInputDTO): Promise<{
    users: UserDocument[];
    totalCount: number;
    pageInfo: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    this.logger.log(`Fetching users with input: ${JSON.stringify(input)}`);

    const { page, limit, ids } = input;

    // Validate page and limit
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    // Build query
    const query: any = {};
    if (ids && ids.length > 0) {
      const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new BadRequestException('One or more IDs are invalid');
      }
      query._id = { $in: validIds.map((id) => new Types.ObjectId(id)) };
    }

    this.logger.log(`Fetching users with query ${JSON.stringify(query)}`);

    try {
      // Fetch total count
      const totalCount = await this.userModel.countDocuments(query);

      // Calculate pagination
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalCount / limit);

      // Fetch users
      const users = await this.userModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .exec();

      // Build pageInfo
      const pageInfo = {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      this.logger.log(`Fetched ${users.length} users for page ${page}`);

      return {
        users,
        totalCount,
        pageInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch users: ${error.message}`);
      throw new BadRequestException(`Failed to fetch users: ${error.message}`);
    }
  }
}
