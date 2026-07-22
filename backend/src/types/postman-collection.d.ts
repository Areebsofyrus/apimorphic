declare module 'postman-collection' {
  export class Collection {
    name: string;
    description?: { toString(): string };
    constructor(definition?: any);
    forEachItem(callback: (item: any) => void): void;
  }
}
