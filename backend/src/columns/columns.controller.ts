import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import type { Column } from '../domain/index.js';
import { ErrorResponseDto } from '../http/index.js';
import type { ColumnId } from '../ids.pure.js';

import { ColumnDto, CreateColumnDto, ReorderColumnsDto, UpdateColumnDto } from './columns.dto.js';
import { ColumnsService } from './columns.service.js';
import { ParseColumnIdPipe } from './parse-column-id.pipe.js';

@ApiTags('columns')
@Controller('columns')
export class ColumnsController {
  constructor(private readonly columns: ColumnsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste les colonnes, dans leur ordre d’affichage' })
  @ApiOkResponse({ type: [ColumnDto] })
  list(): Promise<ReadonlyArray<Column>> {
    return this.columns.list();
  }

  @Post()
  @ApiOperation({ summary: 'Ajoute une colonne en dernière position' })
  @ApiCreatedResponse({ type: ColumnDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Nom ou type invalide' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Nom déjà utilisé' })
  create(@Body() dto: CreateColumnDto): Promise<Column> {
    return this.columns.create(dto.name, dto.type);
  }

  // Déclaré avant `:id` par lisibilité ; les verbes HTTP suffisent de toute façon à les distinguer.
  @Put('order')
  @ApiOperation({ summary: 'Réordonne les colonnes (liste complète des ids, nouvel ordre)' })
  @ApiOkResponse({ type: [ColumnDto] })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Id de colonne inconnu' })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto, description: 'Identifiant en double' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Colonnes manquantes dans la liste' })
  reorder(@Body() dto: ReorderColumnsDto): Promise<ReadonlyArray<Column>> {
    return this.columns.reorder(dto.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomme une colonne (le type est immuable)' })
  @ApiOkResponse({ type: ColumnDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Colonne introuvable' })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Nom invalide, ou tentative de changer le type',
  })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Nom déjà utilisé' })
  rename(
    @Param('id', ParseColumnIdPipe) id: ColumnId,
    @Body() dto: UpdateColumnDto,
  ): Promise<Column> {
    return this.columns.rename(id, dto.name, dto.type);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprime une colonne et toutes ses cellules' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Colonne introuvable' })
  remove(@Param('id', ParseColumnIdPipe) id: ColumnId): Promise<void> {
    return this.columns.remove(id);
  }
}
