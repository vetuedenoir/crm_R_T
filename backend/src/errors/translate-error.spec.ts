import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';

import { AppError } from './app-error.js';
import { translateError } from './translate-error.js';

describe('translateError', () => {
  it('conserve une AppError telle quelle', () => {
    const error = new AppError('CONFLICT', 'Doublon');

    expect(translateError(error)).toBe(error);
  });

  it.each([
    ['une NotFoundException', new NotFoundException('Cannot GET /secret'), 'NOT_FOUND', 404],
    ['une BadRequestException', new BadRequestException('détail interne'), 'BAD_REQUEST', 400],
    ['une HttpException 405', new HttpException('x', 405), 'BAD_REQUEST', 400],
    [
      'une erreur Express 4xx',
      Object.assign(new Error('Unexpected token'), { status: 400 }),
      'BAD_REQUEST',
      400,
    ],
    ['une HttpException 503', new HttpException('x', 503), 'INTERNAL', 500],
    ['une erreur quelconque', new Error('SELECT * FROM cells'), 'INTERNAL', 500],
    ['une valeur non-Error', 'texte', 'INTERNAL', 500],
  ])('traduit %s', (_cas, error, code, status) => {
    expect(translateError(error)).toMatchObject({ code, httpStatus: status });
  });

  it("n'expose jamais le message de l'erreur d'origine", () => {
    expect(translateError(new Error('SELECT * FROM cells')).message).not.toContain('SELECT');
    expect(translateError(new NotFoundException('Cannot GET /secret')).message).not.toContain(
      'secret',
    );
  });

  it('traduit une erreur PostgreSQL', () => {
    expect(translateError({ code: '23505', severity: 'ERROR' })).toMatchObject({
      code: 'CONFLICT',
    });
  });
});
