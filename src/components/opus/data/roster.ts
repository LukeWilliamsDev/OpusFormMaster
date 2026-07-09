import { Worker, ScheduledShift } from '../types/erp';

export const INITIAL_ROSTER: Worker[] = [
  {
    id: 'w-1',
    name: 'Marcus Vance',
    role: 'Supervisor',
    phone: '+44 7700 900221',
    email: 'marcus.vance@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-1', name: 'cscs_card_marcus_vance.pdf', size: '1.4 MB', uploadedAt: '2026-02-15' },
      { id: 'c-2', name: 'supervisor_cert_mv.pdf', size: '2.1 MB', uploadedAt: '2026-03-01' }
    ],
    tickets: [
      { id: 't-1', type: 'CSCS', expiryDate: '2028-11-15', ticketNumber: 'CSCS-994821' },
      { id: 't-2', type: 'Supervisor', expiryDate: '2027-04-22', ticketNumber: 'SUP-883712' }
    ]
  },
  {
    id: 'w-2',
    name: 'Declan Brody',
    role: 'Operative',
    phone: '+44 7700 900456',
    email: 'declan.brody@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-3', name: 'cscs_declan_brody.pdf', size: '1.1 MB', uploadedAt: '2026-01-20' }
    ],
    tickets: [
      { id: 't-3', type: 'CSCS', expiryDate: '2027-02-10', ticketNumber: 'CSCS-772635' }
    ]
  },
  {
    id: 'w-3',
    name: 'Sean O\'Connor',
    role: 'Operative',
    phone: '+44 7700 900789',
    email: 'sean.oconnor@opusconcrete.co.uk',
    uploadedCertificates: [],
    tickets: [
      { id: 't-4', type: 'CSCS', expiryDate: '2025-05-20', ticketNumber: 'CSCS-334215' } // Expired CSCS!
    ]
  },
  {
    id: 'w-4',
    name: 'Gareth Evans',
    role: 'Telehandler',
    phone: '+44 7700 900112',
    email: 'gareth.evans@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-4', name: 'cscs_gareth_evans.pdf', size: '1.5 MB', uploadedAt: '2025-11-12' },
      { id: 'c-5', name: 'telehandler_cpcs_ge.pdf', size: '3.4 MB', uploadedAt: '2025-12-05' }
    ],
    tickets: [
      { id: 't-5', type: 'CSCS', expiryDate: '2028-01-30', ticketNumber: 'CSCS-449210' },
      { id: 't-6', type: 'Telehandler', expiryDate: '2027-12-10', ticketNumber: 'TEL-102941' }
    ]
  },
  {
    id: 'w-5',
    name: 'Liam Sterling',
    role: 'Groundworker',
    phone: '+44 7700 900993',
    email: 'liam.sterling@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-6', name: 'cscs_liam_sterling.pdf', size: '1.2 MB', uploadedAt: '2026-04-18' }
    ],
    tickets: [
      { id: 't-7', type: 'CSCS', expiryDate: '2026-09-12', ticketNumber: 'CSCS-221094' }
    ]
  },
  {
    id: 'w-6',
    name: 'Harrison Forde',
    role: 'Supervisor',
    phone: '+44 7700 900554',
    email: 'harrison.forde@opusconcrete.co.uk',
    uploadedCertificates: [],
    tickets: [
      { id: 't-8', type: 'CSCS', expiryDate: '2024-12-01', ticketNumber: 'CSCS-554612' } // Expired CSCS!
    ]
  },
  {
    id: 'w-7',
    name: 'Kallum Finch',
    role: 'Operative',
    phone: '+44 7700 900887',
    email: 'kallum.finch@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-7', name: 'cscs_kallum_finch.pdf', size: '1.3 MB', uploadedAt: '2026-05-10' }
    ],
    tickets: [
      { id: 't-9', type: 'CSCS', expiryDate: '2026-07-28', ticketNumber: 'CSCS-119382' } // Expiring within 30 days!
    ]
  },
  {
    id: 'w-8',
    name: 'Niall Gallagher',
    role: 'Groundworker',
    phone: '+44 7700 900332',
    email: 'niall.gallagher@opusconcrete.co.uk',
    uploadedCertificates: [
      { id: 'c-8', name: 'cscs_niall_gallagher.pdf', size: '1.2 MB', uploadedAt: '2026-02-28' }
    ],
    tickets: [
      { id: 't-10', type: 'CSCS', expiryDate: '2029-03-05', ticketNumber: 'CSCS-667239' }
    ]
  }
];

export const INITIAL_SHIFTS: ScheduledShift[] = [
  // === ACTIVE DEPLOYMENTS (Current Week: July 6 - July 10, 2026) ===
  // w-1 (Marcus Vance - Supervisor) deployed to Riverside Phase 2 (jobId '1')
  { id: 's-act-1-1', workerId: 'w-1', jobId: '1', date: '2026-07-06' },
  { id: 's-act-1-2', workerId: 'w-1', jobId: '1', date: '2026-07-07' },
  { id: 's-act-1-3', workerId: 'w-1', jobId: '1', date: '2026-07-08' },
  { id: 's-act-1-4', workerId: 'w-1', jobId: '1', date: '2026-07-09' },
  { id: 's-act-1-5', workerId: 'w-1', jobId: '1', date: '2026-07-10' },

  // w-2 (Declan Brody - Operative) deployed to Riverside Phase 2 (jobId '1')
  { id: 's-act-2-1', workerId: 'w-2', jobId: '1', date: '2026-07-06' },
  { id: 's-act-2-2', workerId: 'w-2', jobId: '1', date: '2026-07-07' },
  { id: 's-act-2-3', workerId: 'w-2', jobId: '1', date: '2026-07-08' },

  // w-4 (Gareth Evans - Telehandler) deployed to Oakwood Grounds (jobId '2')
  { id: 's-act-4-1', workerId: 'w-4', jobId: '2', date: '2026-07-07' },
  { id: 's-act-4-2', workerId: 'w-4', jobId: '2', date: '2026-07-08' },
  { id: 's-act-4-3', workerId: 'w-4', jobId: '2', date: '2026-07-09' },
  { id: 's-act-4-4', workerId: 'w-4', jobId: '2', date: '2026-07-10' },

  // w-5 (Liam Sterling - Groundworker) deployed to Marina Development (jobId '5')
  { id: 's-act-5-1', workerId: 'w-5', jobId: '5', date: '2026-07-06' },
  { id: 's-act-5-2', workerId: 'w-5', jobId: '5', date: '2026-07-07' },
  { id: 's-act-5-3', workerId: 'w-5', jobId: '5', date: '2026-07-08' },

  // w-7 (Kallum Finch - Operative) deployed to Central Square (jobId '4')
  { id: 's-act-7-1', workerId: 'w-7', jobId: '4', date: '2026-07-08' },
  { id: 's-act-7-2', workerId: 'w-7', jobId: '4', date: '2026-07-09' },
  { id: 's-act-7-3', workerId: 'w-7', jobId: '4', date: '2026-07-10' },

  // w-8 (Niall Gallagher - Groundworker) deployed to Central Square (jobId '4')
  { id: 's-act-8-1', workerId: 'w-8', jobId: '4', date: '2026-07-08' },
  { id: 's-act-8-2', workerId: 'w-8', jobId: '4', date: '2026-07-09' },
  { id: 's-act-8-3', workerId: 'w-8', jobId: '4', date: '2026-07-10' },


  // === DEPLOYMENT HISTORY: HISTORICAL PAST SHIFTS (Completed / Older than Today) ===
  
  // w-1 (Marcus Vance - Supervisor) - Brentwood Hub (jobId '3', completed) - Week of June 15
  { id: 's-hist-1-1', workerId: 'w-1', jobId: '3', date: '2026-06-15' },
  { id: 's-hist-1-2', workerId: 'w-1', jobId: '3', date: '2026-06-16' },
  { id: 's-hist-1-3', workerId: 'w-1', jobId: '3', date: '2026-06-17' },
  { id: 's-hist-1-4', workerId: 'w-1', jobId: '3', date: '2026-06-18' },
  { id: 's-hist-1-5', workerId: 'w-1', jobId: '3', date: '2026-06-19' },
  // w-1 (Marcus Vance) - Brentwood Hub (jobId '3', completed) - Week of June 22
  { id: 's-hist-1-6', workerId: 'w-1', jobId: '3', date: '2026-06-22' },
  { id: 's-hist-1-7', workerId: 'w-1', jobId: '3', date: '2026-06-23' },
  { id: 's-hist-1-8', workerId: 'w-1', jobId: '3', date: '2026-06-24' },
  { id: 's-hist-1-9', workerId: 'w-1', jobId: '3', date: '2026-06-25' },
  { id: 's-hist-1-10', workerId: 'w-1', jobId: '3', date: '2026-06-26' },
  // w-1 (Marcus Vance) - Central Square (jobId '4', active) - Week of June 29 (Past dates, so counts as history)
  { id: 's-hist-1-11', workerId: 'w-1', jobId: '4', date: '2026-07-01' },
  { id: 's-hist-1-12', workerId: 'w-1', jobId: '4', date: '2026-07-02' },
  { id: 's-hist-1-13', workerId: 'w-1', jobId: '4', date: '2026-07-03' },

  // w-2 (Declan Brody - Operative) - Brentwood Hub (jobId '3', completed) - Week of June 15
  { id: 's-hist-2-1', workerId: 'w-2', jobId: '3', date: '2026-06-15' },
  { id: 's-hist-2-2', workerId: 'w-2', jobId: '3', date: '2026-06-16' },
  { id: 's-hist-2-3', workerId: 'w-2', jobId: '3', date: '2026-06-17' },
  { id: 's-hist-2-4', workerId: 'w-2', jobId: '3', date: '2026-06-18' },
  { id: 's-hist-2-5', workerId: 'w-2', jobId: '3', date: '2026-06-19' },
  // w-2 (Declan Brody) - Brentwood Hub (jobId '3', completed) - Week of June 22
  { id: 's-hist-2-6', workerId: 'w-2', jobId: '3', date: '2026-06-22' },
  { id: 's-hist-2-7', workerId: 'w-2', jobId: '3', date: '2026-06-23' },
  { id: 's-hist-2-8', workerId: 'w-2', jobId: '3', date: '2026-06-24' },
  { id: 's-hist-2-9', workerId: 'w-2', jobId: '3', date: '2026-06-25' },
  { id: 's-hist-2-10', workerId: 'w-2', jobId: '3', date: '2026-06-26' },
  // w-2 (Declan Brody) - Central Square (jobId '4', active) - Week of June 29 (Past dates, so counts as history)
  { id: 's-hist-2-11', workerId: 'w-2', jobId: '4', date: '2026-07-01' },
  { id: 's-hist-2-12', workerId: 'w-2', jobId: '4', date: '2026-07-02' },
  { id: 's-hist-2-13', workerId: 'w-2', jobId: '4', date: '2026-07-03' },

  // w-4 (Gareth Evans - Telehandler) - Brentwood Hub (jobId '3', completed) - Week of June 15
  { id: 's-hist-4-1', workerId: 'w-4', jobId: '3', date: '2026-06-15' },
  { id: 's-hist-4-2', workerId: 'w-4', jobId: '3', date: '2026-06-16' },
  { id: 's-hist-4-3', workerId: 'w-4', jobId: '3', date: '2026-06-17' },
  { id: 's-hist-4-4', workerId: 'w-4', jobId: '3', date: '2026-06-18' },
  { id: 's-hist-4-5', workerId: 'w-4', jobId: '3', date: '2026-06-19' },

  // w-5 (Liam Sterling - Groundworker) - Brentwood Hub (jobId '3', completed) - Week of June 15
  { id: 's-hist-5-1', workerId: 'w-5', jobId: '3', date: '2026-06-15' },
  { id: 's-hist-5-2', workerId: 'w-5', jobId: '3', date: '2026-06-16' },
  { id: 's-hist-5-3', workerId: 'w-5', jobId: '3', date: '2026-06-17' },
  { id: 's-hist-5-4', workerId: 'w-5', jobId: '3', date: '2026-06-18' },
  { id: 's-hist-5-5', workerId: 'w-5', jobId: '3', date: '2026-06-19' },
  // w-5 (Liam Sterling) - Oakwood Grounds (jobId '2', active) - Week of June 29 (Past dates, so counts as history)
  { id: 's-hist-5-6', workerId: 'w-5', jobId: '2', date: '2026-06-29' },
  { id: 's-hist-5-7', workerId: 'w-5', jobId: '2', date: '2026-06-30' },
  { id: 's-hist-5-8', workerId: 'w-5', jobId: '2', date: '2026-07-01' },

  // w-7 (Kallum Finch - Operative) - Riverside Phase 2 (jobId '1', active) - Week of June 29 (Past dates, so counts as history)
  { id: 's-hist-7-1', workerId: 'w-7', jobId: '1', date: '2026-06-29' },
  { id: 's-hist-7-2', workerId: 'w-7', jobId: '1', date: '2026-06-30' },
  { id: 's-hist-7-3', workerId: 'w-7', jobId: '1', date: '2026-07-01' },

  // w-8 (Niall Gallagher - Groundworker) - Brentwood Hub (jobId '3', completed) - Week of June 22
  { id: 's-hist-8-1', workerId: 'w-8', jobId: '3', date: '2026-06-22' },
  { id: 's-hist-8-2', workerId: 'w-8', jobId: '3', date: '2026-06-23' },
  { id: 's-hist-8-3', workerId: 'w-8', jobId: '3', date: '2026-06-24' },
  { id: 's-hist-8-4', workerId: 'w-8', jobId: '3', date: '2026-06-25' },
  { id: 's-hist-8-5', workerId: 'w-8', jobId: '3', date: '2026-06-26' }
];
