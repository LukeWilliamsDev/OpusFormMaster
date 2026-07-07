import { Worker, ScheduledShift } from '../types/erp';

export const INITIAL_ROSTER: Worker[] = [
  {
    id: 'w-1',
    name: 'Marcus Vance',
    role: 'Supervisor',
    phone: '+44 7700 900221',
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
    uploadedCertificates: [
      { id: 'c-8', name: 'cscs_niall_gallagher.pdf', size: '1.2 MB', uploadedAt: '2026-02-28' }
    ],
    tickets: [
      { id: 't-10', type: 'CSCS', expiryDate: '2029-03-05', ticketNumber: 'CSCS-667239' }
    ]
  }
];

export const INITIAL_SHIFTS: ScheduledShift[] = [
  { id: 's-1', workerId: 'w-1', jobId: '1', date: '2026-07-06' },
  { id: 's-2', workerId: 'w-2', jobId: '1', date: '2026-07-06' },
  { id: 's-3', workerId: 'w-4', jobId: '2', date: '2026-07-07' }
];
