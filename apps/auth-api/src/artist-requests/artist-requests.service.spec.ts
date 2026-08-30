import { Types } from 'mongoose';
import { ArtistRequestsService } from './artist-requests.service';
import { ArtistRequestStatus } from '../users/artist-request.schema';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';

describe('ArtistRequestsService', () => {
  let service: ArtistRequestsService;
  let requestModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
  };
  let usersService: {
    findByIdsPublic: jest.Mock;
    update: jest.Mock;
  };
  let sessionsService: { invalidateUserCache: jest.Mock };
  let artistasCollection: { findOneAndUpdate: jest.Mock };

  const userId = new Types.ObjectId();

  const makeRequestDoc = (
    overrides: Record<string, unknown> = {},
  ): Record<string, any> => ({
    _id: new Types.ObjectId(),
    userId: userId.toString(),
    email: 'artist@kornbeat.dev',
    artistName: 'Los Korn',
    genre: 'Rock',
    description: 'Banda de garage',
    links: null,
    status: ArtistRequestStatus.PENDING,
    rejectReason: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const user = {
    _id: userId.toString(),
    email: 'artist@kornbeat.dev',
    name: 'Artista Test',
    es_artist: false,
    isAdmin: false,
  } as any;

  beforeEach(() => {
    requestModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    usersService = {
      findByIdsPublic: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    sessionsService = {
      invalidateUserCache: jest.fn().mockResolvedValue(undefined),
    };
    artistasCollection = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };

    const connection = {
      collection: jest.fn(() => artistasCollection),
    };

    service = new ArtistRequestsService(
      requestModel as any,
      usersService as unknown as UsersService,
      sessionsService as unknown as SessionsService,
      connection as any,
    );
  });

  describe('createRequest', () => {
    const dto = {
      artistName: 'Los Korn',
      genre: 'Rock',
      description: 'Banda de garage',
    } as any;

    it('crea una solicitud pending', async () => {
      requestModel.findOne.mockResolvedValue(null);
      const created = makeRequestDoc();
      requestModel.create.mockResolvedValue(created);

      const result = await service.createRequest(user, dto);

      expect(result.success).toBe(true);
      expect(result.request.status).toBe('pending');
      expect(requestModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId.toString(),
          artistName: 'Los Korn',
          status: ArtistRequestStatus.PENDING,
        }),
      );
    });

    it('rechaza si el usuario ya es artista', async () => {
      await expect(
        service.createRequest({ ...user, es_artist: true } as any, dto),
      ).rejects.toThrow('Tu cuenta ya es de artista');
    });

    it('rechaza si ya hay una solicitud pending', async () => {
      requestModel.findOne.mockResolvedValue(makeRequestDoc());
      await expect(
        service.createRequest(user, dto),
      ).rejects.toThrow('Ya tienes una solicitud en revisión');
    });
  });

  describe('getMine', () => {
    it('devuelve la última solicitud y isArtist', async () => {
      requestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(makeRequestDoc()),
      });

      const result = await service.getMine(user);

      expect(result.isArtist).toBe(false);
      expect((result.request as { artistName: string }).artistName).toBe(
        'Los Korn',
      );
    });

    it('devuelve request null si no hay solicitudes', async () => {
      requestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getMine(user);
      expect(result.request).toBeNull();
    });
  });

  describe('listAll', () => {
    it('ordena pending primero y adjunta usuario', async () => {
      const approved = makeRequestDoc({
        status: ArtistRequestStatus.APPROVED,
        createdAt: new Date('2026-08-02T10:00:00Z'),
      });
      const otherId = new Types.ObjectId();
      const pending = makeRequestDoc({
        _id: new Types.ObjectId(),
        userId: otherId.toString(),
        email: 'otro@kornbeat.dev',
        status: ArtistRequestStatus.PENDING,
        createdAt: new Date('2026-08-01T09:00:00Z'),
      });
      requestModel.find.mockResolvedValue([approved, pending]);
      usersService.findByIdsPublic.mockResolvedValue([
        {
          _id: otherId,
          name: 'Otro',
          email: 'otro@kornbeat.dev',
        },
      ]);

      const result = await service.listAll();

      expect(result.count).toBe(2);
      expect(result.requests[0].status).toBe('pending');
      expect(result.requests[0].user?.name).toBe('Otro');
      expect(result.requests[1].status).toBe('approved');
      expect(result.requests[1].user).toBeNull();
    });

    it('rechaza estados inválidos', async () => {
      await expect(service.listAll('foo')).rejects.toThrow('Estado inválido');
    });
  });

  describe('review', () => {
    const adminEmail = 'admin@kornbeat.dev';

    it('approve: marca es_artist + artist_name, crea artista e invalida caché', async () => {
      const doc = makeRequestDoc();
      requestModel.findById.mockResolvedValue(doc);
      usersService.update.mockResolvedValue({ _id: userId, country: 'ES' });

      const result = await service.review(
        doc._id.toString(),
        'approve',
        undefined,
        adminEmail,
      );

      expect(result.request.status).toBe('approved');
      expect(usersService.update).toHaveBeenCalledWith(
        userId.toString(),
        { es_artist: true, artist_name: 'Los Korn' },
      );
      expect(artistasCollection.findOneAndUpdate).toHaveBeenCalled();
      expect(sessionsService.invalidateUserCache).toHaveBeenCalledWith(
        userId.toString(),
      );
      expect(doc.reviewedBy).toBe(adminEmail);
      expect(doc.reviewedAt).toBeInstanceOf(Date);
    });

    it('reject: guarda el motivo', async () => {
      const doc = makeRequestDoc();
      requestModel.findById.mockResolvedValue(doc);

      const result = await service.review(
        doc._id.toString(),
        'reject',
        'Mejora tu material',
        adminEmail,
      );

      expect(result.request.status).toBe('rejected');
      expect(result.request.rejectReason).toBe('Mejora tu material');
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('rechaza si la solicitud ya fue revisada', async () => {
      const doc = makeRequestDoc({ status: ArtistRequestStatus.APPROVED });
      requestModel.findById.mockResolvedValue(doc);

      await expect(
        service.review(doc._id.toString(), 'reject', undefined, adminEmail),
      ).rejects.toThrow('La solicitud ya fue revisada');
    });

    it('404 si no existe', async () => {
      requestModel.findById.mockResolvedValue(null);
      await expect(
        service.review(
          new Types.ObjectId().toString(),
          'approve',
          undefined,
          adminEmail,
        ),
      ).rejects.toThrow('Solicitud no encontrada');
    });
  });
});
