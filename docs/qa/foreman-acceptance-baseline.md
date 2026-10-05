# Foreman QA acceptance baseline

The project retains one isolated QA tenant for repeatable authenticated checks:

- Tenant slug: `qa-acceptance-20261001-f7a91f`
- Roles: admin, director, logistics coordinator, logistics assistant, site Foreman, third party, Labourer
- Fixture: one Foreman staff record, one assigned job, and one shift
- Credentials: local-only file `/home/ubuntu/.config/opusform-qa-accounts.json` with mode `0600`

The tenant is not visible to normal production-tenant users because profiles,
staff, jobs, and shifts are tenant-scoped by RLS. QA users can see the fixture
inside the QA tenant by design.

Acceptance runs may create temporary diary, issue, note, reply, completed-site,
and attachment records. The run must remove those temporary records and
objects afterward; the baseline tenant and accounts remain.
