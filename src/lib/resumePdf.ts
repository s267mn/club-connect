import jsPDF from 'jspdf';

export type ClubRole = 'faculty' | 'lead' | 'member';

export interface ResumeClubMembership {
  clubName: string;
  role: ClubRole;
}

export interface ResumeContributionData {
  title: string;
  score: number;
  clubName: string;
  skillName: string;
}

export interface ResumeSkillRatingData {
  skillName: string;
  averageScore: number;
}

export interface ResumeBuildInput {
  name: string;
  email: string;
  avatarUrl?: string;
  overallRating: number;
  totalVerified: number;
  memberships: ResumeClubMembership[];
  contributions: ResumeContributionData[];
  skillRatings: ResumeSkillRatingData[];
}

const ROLE_ORDER: Record<ClubRole, number> = {
  faculty: 0,
  lead: 1,
  member: 2,
};

const ROLE_DISPLAY: Record<ClubRole, string> = {
  faculty: 'Faculty Advisor',
  lead: 'Lead',
  member: 'Member',
};

export async function loadImageAsDataUrl(
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildResumePdf(
  input: ResumeBuildInput
): Promise<jsPDF> {
  const {
    name,
    email,
    avatarUrl,
    overallRating,
    totalVerified,
    memberships,
    contributions,
    skillRatings,
  } = input;

  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let cursorY = 56;

  const brandOrange: [number, number, number] = [217, 118, 74];
  const ink: [number, number, number] = [42, 38, 34];
  const inkDim: [number, number, number] = [120, 112, 104];
  const border: [number, number, number] = [225, 216, 204];

  /* Header band */
  doc.setFillColor(...brandOrange);
  doc.rect(0, 0, pageWidth, 8, 'F');

  /* Avatar */
  let textStartX = marginX;

  if (avatarUrl) {
    const dataUrl = await loadImageAsDataUrl(avatarUrl);

    if (dataUrl) {
      try {
        doc.addImage(dataUrl, 'JPEG', marginX, cursorY, 64, 64, undefined, 'FAST');
        textStartX = marginX + 80;
      } catch {
        // If image embedding fails for any reason, fall back to text-only header.
      }
    }
  }

  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(name, textStartX, cursorY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...inkDim);
  doc.text(email, textStartX, cursorY + 40);

  const topRole = memberships
    .slice()
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])[0];

  if (topRole) {
    doc.text(
      `${ROLE_DISPLAY[topRole.role]} · ${topRole.clubName}`,
      textStartX,
      cursorY + 56
    );
  }

  cursorY += 96;

  /* Divider */
  doc.setDrawColor(...border);
  doc.setLineWidth(1);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 28;

  /* Stats row */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ink);
  doc.text(`Overall Rating: ${overallRating}`, marginX, cursorY);
  doc.text(
    `Verified Contributions: ${totalVerified}`,
    marginX + 220,
    cursorY
  );
  doc.text(
    `Clubs: ${memberships.length}`,
    marginX + 440,
    cursorY
  );

  cursorY += 30;

  const sectionHeading = (label: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...brandOrange);
    doc.text(label.toUpperCase(), marginX, cursorY);
    cursorY += 8;
    doc.setDrawColor(...border);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 20;
  };

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > doc.internal.pageSize.getHeight() - 56) {
      doc.addPage();
      cursorY = 56;
    }
  };

  /* Club roles */
  if (memberships.length > 0) {
    sectionHeading('Club Involvement');

    const sortedMemberships = memberships
      .slice()
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

    for (const membership of sortedMemberships) {
      ensureSpace(20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      doc.text(membership.clubName, marginX, cursorY);

      doc.setTextColor(...brandOrange);
      doc.setFont('helvetica', 'bold');
      doc.text(
        ROLE_DISPLAY[membership.role],
        pageWidth - marginX,
        cursorY,
        { align: 'right' }
      );

      cursorY += 18;
    }

    cursorY += 14;
  }

  /* Skill ratings */
  if (skillRatings.length > 0) {
    ensureSpace(60);
    sectionHeading('Skill Ratings');

    for (const rating of skillRatings) {
      ensureSpace(20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      doc.text(rating.skillName, marginX, cursorY);

      doc.setFont('helvetica', 'bold');
      doc.text(
        String(rating.averageScore),
        pageWidth - marginX,
        cursorY,
        { align: 'right' }
      );

      cursorY += 18;
    }

    cursorY += 14;
  }

  /* Verified contributions */
  if (contributions.length > 0) {
    ensureSpace(60);
    sectionHeading('Verified Contributions');

    for (const contribution of contributions) {
      ensureSpace(34);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...ink);
      doc.text(contribution.title, marginX, cursorY);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...brandOrange);
      doc.text(
        String(contribution.score),
        pageWidth - marginX,
        cursorY,
        { align: 'right' }
      );

      cursorY += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...inkDim);
      doc.text(
        `${contribution.clubName} · ${contribution.skillName}`,
        marginX,
        cursorY
      );

      cursorY += 22;
    }
  }

  /* Footer branding on every page */
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...inkDim);
    doc.text(
      'Generated via ClubConnect · NITK',
      marginX,
      doc.internal.pageSize.getHeight() - 32
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 32,
      { align: 'right' }
    );
  }

  return doc;
}