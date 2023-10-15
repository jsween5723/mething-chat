import { Logger, NotFoundException } from '@nestjs/common';
import {
  Connection,
  FilterQuery,
  Model,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';
import { BaseSchema } from './entity/base-entity.schema';

export abstract class BaseRepository<TDocument extends BaseSchema> {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly model: Model<TDocument>,
    private readonly connection: Connection,
  ) {}

  async create(
    document: Partial<TDocument>,
    options?: SaveOptions,
  ): Promise<TDocument> {
    const createdDocument = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });
    return (
      await createdDocument.save(options)
    ).toJSON() as unknown as TDocument;
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    const document = await this.model.findOne(filterQuery);

    if (!document) {
      this.logger.warn('Document not found with filterQuery', filterQuery);
      throw new NotFoundException('Document not found.');
    }
    return document;
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    update: UpdateQuery<TDocument>,
  ) {
    const document = await this.model.findOneAndUpdate(filterQuery, update, {
      lean: true,
      new: true,
    });

    if (!document) {
      this.logger.warn(`Document not found with filterQuery:`, filterQuery);
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async upsert(
    filterQuery: FilterQuery<TDocument>,
    document: Partial<TDocument>,
  ) {
    return this.model.findOneAndUpdate(filterQuery, document, {
      lean: true,
      upsert: true,
      new: true,
    });
  }

  async find(filterQuery: FilterQuery<TDocument>) {
    return this.model
      .find(filterQuery, {}, { lean: true })
      .sort({ createdAt: 1 });
  }

  async startTransaction() {
    const session = await this.connection.startSession();
    session.startTransaction();
    return session;
  }
}
