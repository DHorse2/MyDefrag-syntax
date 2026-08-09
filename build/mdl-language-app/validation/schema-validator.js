'use strict';

const Ajv = require('ajv');
const { VIEW_DEFINITIONS } = require('../shared/contracts');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

class SchemaValidator {
    constructor(schemas) {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        this.schemas = new Map();
        for (const schema of schemas) {
            this.schemas.set(schema.name, schema.data);
            this.ajv.addSchema(schema.data, schema.name);
        }
    }

    validateDocument(viewName, document) {
        const definition = VIEW_DEFINITIONS[viewName];
        const validate = definition && this.ajv.getSchema(definition.schema);
        if (!validate) {
            return [{ path: '', message: `No applicable schema is available for ${viewName}.` }];
        }
        if (validate(document)) {
            return [];
        }
        return (validate.errors || []).map((error) => ({
            path: error.instancePath || '/',
            message: error.message || error.keyword,
            keyword: error.keyword,
            params: error.params
        }));
    }

    recordSchema(viewName) {
        const definition = VIEW_DEFINITIONS[viewName];
        const documentSchema = this.schemas.get(definition.schema);
        const itemSchema = documentSchema?.properties?.[definition.collectionKey]?.items;
        return this.resolveReferences(clone(itemSchema || {}));
    }

    resolveReferences(value) {
        if (Array.isArray(value)) {
            return value.map((item) => this.resolveReferences(item));
        }
        if (!value || typeof value !== 'object') {
            return value;
        }
        if (value.$ref) {
            const [schemaName, pointer = ''] = value.$ref.split('#');
            let resolved = clone(this.schemas.get(schemaName) || {});
            for (const part of pointer.split('/').filter(Boolean)) {
                resolved = resolved[part.replace(/~1/g, '/').replace(/~0/g, '~')];
            }
            return this.resolveReferences({ ...resolved, ...Object.fromEntries(
                Object.entries(value).filter(([key]) => key !== '$ref')
            ) });
        }
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            this.resolveReferences(item)
        ]));
    }
}

module.exports = {
    SchemaValidator
};
