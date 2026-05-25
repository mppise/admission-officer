#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { validateEnv } from '../config/env.js';
import { toSlug } from '../utils/slugUtils.js';
import { fileExists, readFile, dataPath } from '../utils/fileUtils.js';
import { buildStudentProfile, showStudentProfile } from '../components/c02-student-profile/index.js';
import { buildUniversityProfile, showUniversityProfile } from '../components/c03-university-profile/index.js';
import { buildGuidance, showGuidance } from '../components/c04-guidance-engine/index.js';
import { buildEssay, showEssay } from '../components/c05-essay-advisor/index.js';
import { exportToPdf } from '../components/c06-pdf-exporter/index.js';

const program = new Command();

program
  .name('ao')
  .description('Admissions Officer CLI — personalized college guidance for high school students')
  .version('1.0.0');

// [C01-F03] Check that a student profile exists and has intendedMajor
async function checkStudentPrerequisite(nameSlug: string): Promise<void> {
  const profilePath = dataPath(nameSlug, 'profile.md');
  const exists = await fileExists(profilePath);
  if (!exists) {
    console.error(`No student profile found for "${nameSlug}". Run: ao --student-profile --build --name ${nameSlug}`);
    process.exit(1);
  }
  const content = await readFile(profilePath);
  const match = content.match(/\|\s*Intended Majors \/ Tracks\s*\|\s*([^|\n]+)\|/);
  const majors = match ? match[1].trim() : '';
  if (!majors || majors === 'Not provided') {
    console.error(`Student profile for "${nameSlug}" has no intended majors. Run: ao --student-profile --build --name ${nameSlug} to update.`);
    process.exit(1);
  }
}

// [C01-F04] PDF composition — invoked after any build/show command when --print is set
async function handlePrint(markdownPath: string, isBuild: boolean): Promise<void> {
  try {
    console.log('Exporting to PDF...');
    const { pdfPath } = await exportToPdf(markdownPath);
    console.log(`PDF exported: ${pdfPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isBuild) {
      console.error(`PDF export failed: ${msg}`);
      process.exit(1);
    } else {
      // Non-fatal for --show --print: content already printed to stdout
      console.error(`Warning: PDF export failed — ${msg}. You can open the markdown file directly at ${markdownPath}`);
    }
  }
}

// ─── CLI definition ───────────────────────────────────────────────────────────

program
  .option('--student-profile', 'Student profile mode')
  .option('--university-profile', 'University profile mode')
  .option('--guidance', 'Guidance engine mode')
  .option('--essay', 'Essay advisor mode')
  .option('--build', 'Build or rebuild')
  .option('--show', 'Display stored data')
  .option('--name <name>', 'Student or university name')
  .option('--domain <domain>', 'University domain (e.g. mit.edu)')
  .option('--student <name>', 'Student name')
  .option('--university <name>', 'University name')
  .option('--print', 'Export output to PDF')
  .allowUnknownOption(false)
  .addHelpText('afterAll', `
Workflow:

  Step 1 — Student Profile
    ao --student-profile --build [--name <name>]               Create or update student profile (interactive wizard)
    ao --student-profile --show  --name <name>                 Display stored student profile
    ao --student-profile --show  --name <name> --print         Export student profile to PDF

  Step 2 — University Profile  (requires student profile with intended majors)
    ao --university-profile --build --domain <domain> --student <name>           Crawl university site and build profile
    ao --university-profile --show  --student <name> --university <name>         Display stored university profile
    ao --university-profile --show  --student <name> --university <name> --print Export university profile to PDF

  Step 3 — Guidance  (requires student + university profiles)
    ao --guidance --build --student <name> --university <name>           Generate personalised guidance report
    ao --guidance --show  --student <name> --university <name>           Display stored guidance report
    ao --guidance --show  --student <name> --university <name> --print   Export guidance report to PDF

  Step 4 — Essay  (requires student + university profiles)
    ao --essay --build --student <name> --university <name>           Draft an application essay (interactive)
    ao --essay --show  --student <name> --university <name>           Display stored essay draft(s)
    ao --essay --show  --student <name> --university <name> --print   Export essay draft to PDF
`);

program.action(async (opts) => {
  const {
    studentProfile,
    universityProfile,
    guidance,
    essay,
    build,
    show,
    name,
    domain,
    student,
    university,
    print: printFlag,
  } = opts;

  // Enforce mutual exclusion of command groups
  const groups = [studentProfile, universityProfile, guidance, essay].filter(Boolean);
  if (groups.length === 0) {
    program.help();
  }
  if (groups.length > 1) {
    console.error('Only one command group can be active at a time (--student-profile, --university-profile, --guidance, --essay).');
    process.exit(1);
  }
  if (!build && !show) {
    console.error('Must specify either --build or --show.');
    process.exit(1);
  }
  if (build && show) {
    console.error('Cannot use --build and --show together.');
    process.exit(1);
  }

  try {
    // ── Student Profile ──────────────────────────────────────────────────────
    if (studentProfile) {
      if (build) {
        const nameArg = name ? toSlug(name) : undefined;
        console.log('Building student profile...');
        const { profilePath } = await buildStudentProfile(nameArg);
        console.log(`Saved: ${profilePath}`);
        if (printFlag) await handlePrint(profilePath, true);
      } else {
        if (!name) {
          console.error('--name <name> is required for --student-profile --show');
          process.exit(1);
        }
        const { markdownPath } = await showStudentProfile(toSlug(name));
        if (printFlag) await handlePrint(markdownPath, false);
      }
      return;
    }

    // ── University Profile ───────────────────────────────────────────────────
    if (universityProfile) {
      if (build) {
        if (!domain) {
          console.error('--domain <domain> is required for --university-profile --build');
          process.exit(1);
        }
        if (!student) {
          console.error('--student <name> is required for --university-profile --build');
          process.exit(1);
        }
        const studentSlug = toSlug(student);
        await checkStudentPrerequisite(studentSlug);
        validateEnv();
        const nameArg = name ? toSlug(name) : undefined;
        console.log(`Building university profile for ${domain}...`);
        const { profilePath } = await buildUniversityProfile(domain, nameArg, studentSlug);
        console.log(`Saved: ${profilePath}`);
        if (printFlag) await handlePrint(profilePath, true);
      } else {
        if (!student) {
          console.error('--student <name> is required for --university-profile --show');
          process.exit(1);
        }
        if (!name && !university) {
          console.error('--name <name> or --university <name> is required for --university-profile --show');
          process.exit(1);
        }
        const studentSlug = toSlug(student);
        const uniSlug = toSlug((university || name) as string);
        const { markdownPath } = await showUniversityProfile(studentSlug, uniSlug);
        if (printFlag) await handlePrint(markdownPath, false);
      }
      return;
    }

    // ── Guidance ─────────────────────────────────────────────────────────────
    if (guidance) {
      if (!student) {
        console.error('--student <name> is required for --guidance');
        process.exit(1);
      }
      if (!university) {
        console.error('--university <name> is required for --guidance');
        process.exit(1);
      }
      const studentSlug = toSlug(student);
      const uniSlug = toSlug(university);
      await checkStudentPrerequisite(studentSlug);

      if (build) {
        validateEnv();
        console.log(`Building guidance report for ${student} → ${university}...`);
        const { reportPath } = await buildGuidance(studentSlug, uniSlug);
        console.log(`Saved: ${reportPath}`);
        if (printFlag) await handlePrint(reportPath, true);
      } else {
        const { markdownPath } = await showGuidance(studentSlug, uniSlug);
        if (printFlag) await handlePrint(markdownPath, false);
      }
      return;
    }

    // ── Essay ─────────────────────────────────────────────────────────────────
    if (essay) {
      if (!student) {
        console.error('--student <name> is required for --essay');
        process.exit(1);
      }
      if (!university) {
        console.error('--university <name> is required for --essay');
        process.exit(1);
      }
      const studentSlug = toSlug(student);
      const uniSlug = toSlug(university);
      await checkStudentPrerequisite(studentSlug);

      if (build) {
        validateEnv();
        console.log(`Building essay outline for ${student} → ${university}...`);
        const { essayPath } = await buildEssay(studentSlug, uniSlug);
        console.log(`Saved: ${essayPath}`);
        if (printFlag) await handlePrint(essayPath, true);
      } else {
        const { markdownPath } = await showEssay(studentSlug, uniSlug);
        if (printFlag) await handlePrint(markdownPath, false);
      }
      return;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Something went wrong: ${msg}`);
    process.exit(1);
  }
});

program.parse(process.argv);
