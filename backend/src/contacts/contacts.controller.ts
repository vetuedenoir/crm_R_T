import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '../http/index.js';
import type { ContactId } from '../ids.pure.js';

import type { ContactBody } from './contact-body.pure.js';
import {
  ContactDto,
  ContactsPageDto,
  CreateContactDto,
  ListContactsQueryDto,
  UpdateContactDto,
} from './contacts.dto.js';
import { ContactsService, type ContactsPage } from './contacts.service.js';
import { ParseContactIdPipe } from './parse-contact-id.pipe.js';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @ApiOperation({
    summary: 'Liste une page de contacts, triée et filtrée sur tout le jeu de données',
  })
  @ApiOkResponse({ type: ContactsPageDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Tri ou filtre invalide' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Paramètre mal formé' })
  list(@Query() query: ListContactsQueryDto): Promise<ContactsPage> {
    return this.contacts.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Crée un contact, avec des valeurs initiales facultatives' })
  @ApiCreatedResponse({ type: ContactDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Colonne inconnue' })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Valeur invalide pour le type de sa colonne (détail par colonne)',
  })
  create(@Body() dto: CreateContactDto): Promise<ContactBody> {
    return this.contacts.create(dto.values ?? {});
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifie des cellules d’un contact (`null` vide une cellule)' })
  @ApiOkResponse({ type: ContactDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Contact ou colonne introuvable' })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Valeur invalide pour le type de sa colonne (détail par colonne)',
  })
  update(
    @Param('id', ParseContactIdPipe) id: ContactId,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactBody> {
    return this.contacts.update(id, dto.values);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime un contact et ses cellules' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Contact introuvable' })
  remove(@Param('id', ParseContactIdPipe) id: ContactId): Promise<void> {
    return this.contacts.remove(id);
  }
}
