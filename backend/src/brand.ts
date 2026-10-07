declare const brand: unique symbol;

// Type nominal : `Brand<string, 'ColumnId'>` n'est interchangeable ni avec `string`, ni avec un autre brand.
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };
