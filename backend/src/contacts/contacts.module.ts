import { Module } from '@nestjs/common';

import { PersistenceModule } from '../persistence/index.js';

import { ContactsController } from './contacts.controller.js';
import { ContactsService } from './contacts.service.js';

@Module({
  imports: [PersistenceModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
