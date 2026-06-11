export interface Company {
    id: number;
    name: string;
    entity: string;
    default_gl_format_id: number | null;
}

export interface Companies {
    companies: Company[];
}