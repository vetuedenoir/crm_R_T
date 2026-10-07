import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

// Le contrat REST vit dans le code : la page et le JSON (`/api/docs-json`) ne peuvent pas diverger de l'API.
export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CRM en grille')
      .setDescription(
        "API REST du CRM : colonnes, contacts, tri et filtres sur l'ensemble des données.",
      )
      .setVersion('1.0')
      .build(),
  );
  // `useGlobalPrefix` : la documentation est servie sous /api comme le reste de l'API.
  SwaggerModule.setup(SWAGGER_PATH, app, document, { useGlobalPrefix: true });
}
