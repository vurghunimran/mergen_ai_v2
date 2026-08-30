# Institution directory

Mergen keeps client-affiliation lookup data in Supabase so registration does not depend on a third-party API request.

## Sources

- Universities: [Hipo University Domains and Names](https://github.com/Hipo/university-domains-list) (MIT)
- Research organizations: [Research Organization Registry](https://ror.org/registry/) (CC0)

The ROR import includes active government, nonprofit, company, healthcare, facility, funder, archive, and other research-affiliated organizations. Education-only ROR records are excluded to avoid duplicating the Hipo university directory.

## First deployment

1. Run `supabase/migrate-institution-directory.sql` in the Supabase SQL Editor.
2. Run `npm run sync:institutions` from a trusted environment containing `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy the application.

The sync command upserts records and can safely be rerun. Useful variants:

- `npm run sync:institutions -- --universities-only`
- `npm run sync:institutions -- --institutions-only`
- `npm run sync:institutions -- --dry-run`

Never run the synchronization command in a browser or expose the service-role key to client code.

## Registration behavior

- Clients choose either **University** or **Institution or organization**.
- Country and affiliation type filter the synchronized local directory.
- Name search covers countries with more records than a single dropdown response.
- **Other / not listed** keeps registration available for new or missing organizations.
- Known personal mailbox providers are rejected for client accounts.
- Known directory domains are matched exactly, including their subdomains.
- Unknown non-personal domains must have valid MX records and are accepted using the fallback path.
