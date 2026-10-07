import { Injectable, type PipeTransform } from '@nestjs/common';

import { parseContactId, type ContactId } from '../ids.pure.js';

import { invalidField } from './contact-errors.pure.js';

// Un id mal formé est refusé ici (422, champ `id`) plutôt qu'au contact de PostgreSQL.
@Injectable()
export class ParseContactIdPipe implements PipeTransform<unknown, ContactId> {
  transform(value: unknown): ContactId {
    const parsed = parseContactId(value);
    if (!parsed.ok) {
      throw invalidField('id', parsed.error);
    }
    return parsed.value;
  }
}
