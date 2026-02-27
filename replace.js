import fs from 'fs'
import path from 'path'

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.resolve(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.ejs')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('./views');
let changeCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Replace href="/something" with href="something"
    let updated = content.replace(/href="\//g, 'href="');
    // Replace action="/something" with action="something"
    updated = updated.replace(/action="\//g, 'action="');

    if (content !== updated) {
        fs.writeFileSync(file, updated);
        changeCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Successfully updated ${changeCount} files.`);
