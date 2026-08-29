# Field Notes for Kujo CMS

Field Notes is the default editorial theme bundled with the Kujo CMS showcase. It lives here as an independent, forkable project so creators can copy it, remix it, ship client variants, and distribute installable ZIP packages without carrying the administration application with it.

## Try it

```bash
cp .env.example .env
npm install
npm run dev
```

The theme reads published content from `CMS_BASE_URL`. Start Kujo CMS on `http://127.0.0.1:4200`, or point the environment variable at another instance.

## Make it yours

Fork this repository, change the presentation components under `app/`, and update the identity and distribution fields in `kujo-theme.json`. Public theme code uses only CMS delivery routes and never needs an administration token.

## Package and install

```bash
npm run package
CMS_API_TOKEN=... bash /path/to/cms/scripts/cms-extensions.sh theme:install-zip dist/cms-field-notes-theme.zip active
```

Administrators can also upload the same ZIP from **CMS Studio → Themes & plugins**. The installer checks archive paths, size, expanded size, file count, manifest integrity, and schema before registration.

Theme activation selects the presentation package. A hosted installation can connect that lifecycle to its deployment adapter while self-hosted teams retain control of their build environment.
