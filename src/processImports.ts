import * as options from './options';
import { TypescriptImport } from './TypescriptImport';

export default function processImports(importClauses: TypescriptImport[]): TypescriptImport[] {
    return importClauses
        .map(importClause => {
            if (importClause.namedImports) {
                importClause.namedImports.sort((a, b) => a.importName.localeCompare(b.importName, 'en', { sensitivity: 'base' }));
            }
            return importClause;
        })
        .sort(compareImportClauses);
}

function compareImportClauses(a: TypescriptImport, b: TypescriptImport) {
    if (options.getSortOption() === 'path') {
        return comparePath(a, b)
            || compareCaseInsensitive(a.path, b.path);
    } else {
        return compareImportType(a, b)
            || (a.namespace && compareCaseInsensitive(a.namespace, b.namespace))
            || (a.default && compareCaseInsensitive(a.default, b.default))
            || (a.namedImports && compareCaseInsensitive(a.namedImports[0].importName, b.namedImports[0].importName))
            || comparePath(a, b);
    }
}

function compareCaseInsensitive(a: string, b: string) {
    return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

function comparePath(a: TypescriptImport, b: TypescriptImport) {
    return getPathPriority(a.path) - getPathPriority(b.path);
}

function getPathPriority(path: string) {
    let sortOrder = options.getPathSortOrdering();

    const matchingIdx = sortOrder.findIndex(v => {
        const isOverride = v.charAt(0) === '^';
        if(!isOverride) return false;

        const override = v.substr(1);

        const startsWithOverride = path.indexOf(override) === 0;
        if(!startsWithOverride) return false;

        const isExactMatch = path === override;
        if(isExactMatch) return true;

        // This will prevent `import from "typesafe"` from being triggered by `^types`
        const isPartialMatch = path.charAt(override.length) === '/';
        return isPartialMatch;
    });

    if(matchingIdx >= 0) {
        return matchingIdx;
    }

    if (/^\.\//.test(path)) {
        return sortOrder.indexOf('relativeDownLevel');
    } else if (/^\.\.\//.test(path)) {
        return sortOrder.indexOf('relativeUpLevel');
    } else {
        return sortOrder.indexOf('package');
    }
}

function compareImportType(a: TypescriptImport, b: TypescriptImport) {
    return getImportTypePriority(a) - getImportTypePriority(b);
}

function getImportTypePriority(importClause: TypescriptImport) {
    if (importClause.namespace) {
        return 0;
    } else if (importClause.default) {
        return 1;
    } else if (importClause.namedImports) {
        return 2;
    } else {
        return 3;
    }
}