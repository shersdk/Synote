/**
 * Base Repository Interface
 * 
 * This pattern abstracts database operations, making it easy to swap
 * SQLite for a cloud database (Supabase/Postgres) in the future
 * without changing the UI code.
 */
export interface Repository<T, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * Base class with common repository functionality
 */
export abstract class BaseRepository<T, CreateDTO, UpdateDTO> 
  implements Repository<T, CreateDTO, UpdateDTO> {
  
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(data: CreateDTO): Promise<T>;
  abstract update(id: string, data: UpdateDTO): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
}
