import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Long } from 'bson';
import { MONGO_COLLECTIONS, User } from '@kornbeat/shared';
import {
  ArtistRequest,
  ArtistRequestDocument,
  ArtistRequestStatus,
} from '../users/artist-request.schema';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { CreateArtistRequestDto } from './dto/create-artist-request.dto';

const STATUS_ORDER: Record<ArtistRequestStatus, number> = {
  [ArtistRequestStatus.PENDING]: 0,
  [ArtistRequestStatus.REJECTED]: 1,
  [ArtistRequestStatus.APPROVED]: 2,
};

@Injectable()
export class ArtistRequestsService {
  constructor(
    @InjectModel(ArtistRequest.name)
    private readonly requestModel: Model<ArtistRequestDocument>,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private toResponse(doc: ArtistRequestDocument) {
    return {
      _id: doc._id.toString(),
      userId: doc.userId,
      email: doc.email,
      artistName: doc.artistName,
      genre: doc.genre ?? null,
      description: doc.description ?? null,
      links: doc.links ?? null,
      status: doc.status,
      rejectReason: doc.rejectReason ?? null,
      reviewedBy: doc.reviewedBy ?? null,
      reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    };
  }

  async createRequest(user: User, dto: CreateArtistRequestDto) {
    if (user.es_artist) {
      throw new BadRequestException('Tu cuenta ya es de artista');
    }
    const pending = await this.requestModel.findOne({
      userId: user._id,
      status: ArtistRequestStatus.PENDING,
    });
    if (pending) {
      throw new ConflictException('Ya tienes una solicitud en revisión');
    }
    const doc = await this.requestModel.create({
      userId: user._id,
      email: user.email,
      artistName: dto.artistName,
      genre: dto.genre ?? null,
      description: dto.description ?? null,
      links: dto.links ?? null,
      status: ArtistRequestStatus.PENDING,
    });
    return {
      success: true,
      message:
        'Solicitud enviada. Un administrador revisará tu solicitud de artista.',
      request: this.toResponse(doc),
    };
  }

  async getMine(user: User) {
    const doc = await this.requestModel
      .findOne({ userId: user._id })
      .sort({ createdAt: -1 });
    return {
      success: true,
      isArtist: user.es_artist,
      request: doc ? this.toResponse(doc) : null,
    };
  }

  async listAll(status?: string) {
    if (status && !Object.values(ArtistRequestStatus).includes(status as ArtistRequestStatus)) {
      throw new BadRequestException(
        `Estado inválido: ${status} (usa pending, approved o rejected)`,
      );
    }
    const filter = status ? { status } : {};
    const docs = await this.requestModel.find(filter);
    docs.sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
        (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );

    const userIds = [...new Set(docs.map((d) => d.userId))];
    const users = await this.usersService.findByIdsPublic(userIds);
    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    return {
      success: true,
      count: docs.length,
      requests: docs.map((d) => {
        const u = byId.get(d.userId);
        return {
          ...this.toResponse(d),
          user: u ? { _id: u._id.toString(), name: u.name, email: u.email } : null,
        };
      }),
    };
  }

  async review(
    id: string,
    action: 'approve' | 'reject',
    reason: string | undefined,
    adminEmail: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de solicitud inválido');
    }
    const doc = await this.requestModel.findById(id);
    if (!doc) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (doc.status !== ArtistRequestStatus.PENDING) {
      throw new BadRequestException('La solicitud ya fue revisada');
    }

    if (action === 'approve') {
      const user = await this.usersService.update(doc.userId, {
        es_artist: true,
        artist_name: doc.artistName,
      });
      if (!user) {
        throw new NotFoundException('El usuario de la solicitud ya no existe');
      }
      await this.ensureArtistDoc(
        user._id.toString(),
        doc.artistName,
        user.country ?? null,
      );
      await this.sessionsService.invalidateUserCache(doc.userId);
      doc.status = ArtistRequestStatus.APPROVED;
    } else {
      doc.status = ArtistRequestStatus.REJECTED;
      doc.rejectReason = reason?.trim() ? reason.trim() : null;
    }

    doc.reviewedBy = adminEmail;
    doc.reviewedAt = new Date();
    await doc.save();

    return {
      success: true,
      message:
        action === 'approve'
          ? `Solicitud aceptada: ${doc.artistName} ahora es artista`
          : 'Solicitud rechazada',
      request: this.toResponse(doc),
    };
  }

  /**
   * Garantiza el documento en la colección legacy 'artistas' (jsonSchema:
   * nombre_artistico + country obligatorios) usado por 'albumes'.
   */
  private async ensureArtistDoc(
    userId: string,
    artistName: string,
    country: string | null,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    const collection = this.connection.collection(MONGO_COLLECTIONS.artistas);
    await collection.findOneAndUpdate(
      { usuario_id: new Types.ObjectId(userId) },
      {
        $setOnInsert: {
          usuario_id: new Types.ObjectId(userId),
          nombre_artistico: artistName,
          country: (country ?? 'XX').toUpperCase().slice(0, 3),
          biografia: '',
          verificado: true,
          activo: true,
          oyentes_mensuales: 0,
          // El jsonSchema exige long (int64): un 0 JS se serializa como int32
          reproducciones_totales: Long.fromNumber(0),
          fecha_creacion: new Date(),
        },
      },
      { upsert: true },
    );
  }
}
