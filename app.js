const Koa = require('koa');
const serve = require('koa-static');
const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');

const app = new Koa();
const publicDir = path.join(__dirname, 'public');
const templateDir = path.join(__dirname, 'templates');

Handlebars.registerHelper('eq', function (arg1, arg2) {
  return arg1 === arg2;
});

function isDirectory(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function loadTemplate() {
  const templatePath = path.join(templateDir, 'listing.html');
  const source = fs.readFileSync(templatePath, 'utf8');
  return Handlebars.compile(source);
}

async function generateDirectoryListing(template, requestedPath, urlPath) {
  const entries = fs.readdirSync(requestedPath, { withFileTypes: true });

  const directories = entries.filter(entry => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  const files = entries.filter(entry => !entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

  const sortedEntries = directories.concat(files);

  const items = sortedEntries.map(entry => ({
    name: entry.name,
    url: path.join(urlPath, entry.name),
    type: entry.isDirectory() ? 'directory' : 'file'
  }));

  return template({
    path: urlPath,
    files: items,
    parentUrl: urlPath === '/' ? '/' : path.join(urlPath, '..')
  });
}


const template = loadTemplate();

app.use(async (ctx, next) => {
  let requestedPath = path.join(publicDir, ctx.path);
  requestedPath = path.normalize(requestedPath);

  if (!requestedPath.startsWith(publicDir)) {
    ctx.status = 403;
    return;
  }

  if (isDirectory(requestedPath)) {
    ctx.body = await generateDirectoryListing(template, requestedPath, ctx.path);
    ctx.status = 200;
  } else {
    await next();
  }
});

app.use(serve(publicDir));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
