import { dataService } from './dataService.ts';

export interface KinshipResult {
  english: string;
  tamil: string;
  tagText: string;
  relationType: 'self' | 'direct' | 'ancestor' | 'descendant' | 'inlaw' | 'cousin' | 'relative';
}

export class KinshipService {
  /**
   * Calculates the exact relationship of targetPerson relative to focalPerson.
   * Example: If focal = Gowtham, target = Thangamani V -> Father • அப்பா
   */
  public calculateRelationship(focalId: number, targetId: number): KinshipResult | null {
    if (focalId === targetId) {
      return {
        english: 'Self',
        tamil: 'நான் (Self)',
        tagText: 'Self • நான்',
        relationType: 'self'
      };
    }

    const focal = dataService.getIndividual(focalId);
    const target = dataService.getIndividual(targetId);
    if (!focal || !target) return null;

    const focalGender = focal.gender || 'male';
    const targetGender = target.gender || 'male';
    const isTargetMale = targetGender === 'male';
    const focalBirth = Number(focal.birthYear) || 1990;
    const targetBirth = Number(target.birthYear) || 1990;
    const isTargetOlder = targetBirth <= focalBirth;

    // 1. Spouses (Husband / Wife)
    const focalSpouses = dataService.getSpouses(focalId);
    if (focalSpouses.some(s => s.id === targetId)) {
      return isTargetMale
        ? { english: 'Husband', tamil: 'கணவர் (Kanavar)', tagText: 'Husband • கணவர்', relationType: 'direct' }
        : { english: 'Wife', tamil: 'மனைவி (Manaivi)', tagText: 'Wife • மனைவி', relationType: 'direct' };
    }

    // 2. Parents (Father / Mother)
    const focalParents = dataService.getParents(focalId);
    if (focalParents.some(p => p.id === targetId)) {
      return isTargetMale
        ? { english: 'Father', tamil: 'அப்பா (Appa)', tagText: 'Father • அப்பா', relationType: 'ancestor' }
        : { english: 'Mother', tamil: 'அம்மா (Amma)', tagText: 'Mother • அம்மா', relationType: 'ancestor' };
    }

    // 3. Children (Son / Daughter)
    const focalChildren = dataService.getChildren(focalId);
    if (focalChildren.some(c => c.id === targetId)) {
      return isTargetMale
        ? { english: 'Son', tamil: 'மகன் (Magan)', tagText: 'Son • மகன்', relationType: 'descendant' }
        : { english: 'Daughter', tamil: 'மகள் (Magal)', tagText: 'Daughter • மகள்', relationType: 'descendant' };
    }

    // 4. Siblings (Brother / Sister)
    const focalSiblings = dataService.getSiblings(focalId);
    if (focalSiblings.some(s => s.id === targetId)) {
      if (isTargetMale) {
        return isTargetOlder
          ? { english: 'Elder Brother', tamil: 'அண்ணன் (Annan)', tagText: 'Elder Brother • அண்ணன்', relationType: 'direct' }
          : { english: 'Younger Brother', tamil: 'தம்பி (Thambi)', tagText: 'Younger Brother • தம்பி', relationType: 'direct' };
      } else {
        return isTargetOlder
          ? { english: 'Elder Sister', tamil: 'அக்கா (Akka)', tagText: 'Elder Sister • அக்கா', relationType: 'direct' }
          : { english: 'Younger Sister', tamil: 'தங்கை (Thangachi)', tagText: 'Younger Sister • தங்கை', relationType: 'direct' };
      }
    }

    // 5. Grandparents (Paternal / Maternal)
    for (const parent of focalParents) {
      const gParents = dataService.getParents(parent.id);
      if (gParents.some(gp => gp.id === targetId)) {
        const isPaternal = parent.gender === 'male';
        if (isTargetMale) {
          return {
            english: isPaternal ? 'Paternal Grandfather' : 'Maternal Grandfather',
            tamil: 'தாத்தா (Thatha)',
            tagText: 'Grandfather • தாத்தா',
            relationType: 'ancestor'
          };
        } else {
          return {
            english: isPaternal ? 'Paternal Grandmother' : 'Maternal Grandmother',
            tamil: 'பாட்டி (Paatti)',
            tagText: 'Grandmother • பாட்டி',
            relationType: 'ancestor'
          };
        }
      }
    }

    // 6. Great-Grandparents (3 generations up)
    const ancestors = dataService.getAncestors(focalId, 4);
    const matchedAncestor = ancestors.find(a => a.id === targetId);
    if (matchedAncestor) {
      const depth = (matchedAncestor as any).relationDepth || (focal.generation - target.generation);
      if (depth === 3) {
        return isTargetMale
          ? { english: 'Great-Grandfather', tamil: 'கொள்ளு தாத்தா (Kollu Thatha)', tagText: 'Great-Grandfather • கொள்ளு தாத்தா', relationType: 'ancestor' }
          : { english: 'Great-Grandmother', tamil: 'கொள்ளு பாட்டி (Kollu Paatti)', tagText: 'Great-Grandmother • கொள்ளு பாட்டி', relationType: 'ancestor' };
      }
      if (depth >= 4) {
        return isTargetMale
          ? { english: 'Forefather Ancestor', tamil: 'எள்ளு தாத்தா / முன்னோடி (Forefather)', tagText: 'Forefather • எள்ளு தாத்தா', relationType: 'ancestor' }
          : { english: 'Forefather Ancestress', tamil: 'முன்னோடி பாட்டி (Forebearer)', tagText: 'Forebearer • முன்னோடி பாட்டி', relationType: 'ancestor' };
      }
    }

    // 7. Grandchildren (2 generations down)
    for (const child of focalChildren) {
      const grandChildren = dataService.getChildren(child.id);
      if (grandChildren.some(gc => gc.id === targetId)) {
        return isTargetMale
          ? { english: 'Grandson', tamil: 'பேரன் (Peran)', tagText: 'Grandson • பேரன்', relationType: 'descendant' }
          : { english: 'Granddaughter', tamil: 'பேத்தி (Pethi)', tagText: 'Granddaughter • பேத்தி', relationType: 'descendant' };
      }
    }

    // 8. Paternal & Maternal Aunts and Uncles (Parents' Siblings)
    for (const parent of focalParents) {
      const pSiblings = dataService.getSiblings(parent.id);
      
      // Direct Parent Sibling
      if (pSiblings.some(ps => ps.id === targetId)) {
        const isParentFather = parent.gender === 'male';
        const parentBirth = Number(parent.birthYear) || 1960;
        const targetIsOlderThanParent = targetBirth <= parentBirth;

        if (isParentFather) {
          // Father's Brother
          if (isTargetMale) {
            return targetIsOlderThanParent
              ? { english: 'Elder Paternal Uncle', tamil: 'பெரியப்பா (Periyappa)', tagText: 'Uncle • பெரியப்பா', relationType: 'ancestor' }
              : { english: 'Younger Paternal Uncle', tamil: 'சித்தப்பா (Chithappa)', tagText: 'Uncle • சித்தப்பா', relationType: 'ancestor' };
          } else {
            // Father's Sister -> Athai
            return { english: 'Paternal Aunt', tamil: 'அத்தை (Athai)', tagText: 'Aunt • அத்தை', relationType: 'ancestor' };
          }
        } else {
          // Mother's Brother -> Mama
          if (isTargetMale) {
            return { english: 'Maternal Uncle', tamil: 'தாய்மாமன் / மாமா (Mama)', tagText: 'Uncle • தாய்மாமன்', relationType: 'ancestor' };
          } else {
            // Mother's Sister
            return targetIsOlderThanParent
              ? { english: 'Elder Maternal Aunt', tamil: 'பெரியம்மா (Periyamma)', tagText: 'Aunt • பெரியம்மா', relationType: 'ancestor' }
              : { english: 'Younger Maternal Aunt', tamil: 'சித்தி (Chithi)', tagText: 'Aunt • சித்தி', relationType: 'ancestor' };
          }
        }
      }

      // Parent Sibling's Spouse (Uncle / Aunt by marriage)
      for (const ps of pSiblings) {
        const psSpouses = dataService.getSpouses(ps.id);
        if (psSpouses.some(pss => pss.id === targetId)) {
          const isParentFather = parent.gender === 'male';
          if (isParentFather) {
            // Father's Sister's Husband -> Mama
            if (ps.gender === 'female' && isTargetMale) {
              return { english: 'Uncle (Athai Husband)', tamil: 'மாமா (Mama)', tagText: 'Uncle • மாமா', relationType: 'ancestor' };
            }
            // Father's Brother's Wife -> Periyamma / Chithi
            if (ps.gender === 'male' && !isTargetMale) {
              const psIsOlder = (Number(ps.birthYear) || 1960) <= (Number(parent.birthYear) || 1960);
              return psIsOlder
                ? { english: 'Aunt (Periyappa Wife)', tamil: 'பெரியம்மா (Periyamma)', tagText: 'Aunt • பெரியம்மா', relationType: 'ancestor' }
                : { english: 'Aunt (Chithappa Wife)', tamil: 'சித்தி (Chithi)', tagText: 'Aunt • சித்தி', relationType: 'ancestor' };
            }
          } else {
            // Mother's Brother's Wife -> Athai
            if (ps.gender === 'male' && !isTargetMale) {
              return { english: 'Aunt (Mama Wife)', tamil: 'அத்தை (Athai)', tagText: 'Aunt • அத்தை', relationType: 'ancestor' };
            }
            // Mother's Sister's Husband -> Periyappa / Chithappa
            if (ps.gender === 'female' && isTargetMale) {
              return { english: 'Uncle (Chithi/Periyamma Husband)', tamil: 'சித்தப்பா / பெரியப்பா (Uncle)', tagText: 'Uncle • சித்தப்பா', relationType: 'ancestor' };
            }
          }
        }
      }
    }

    // 9. In-Laws (Spouse's Parents & Siblings)
    for (const spouse of focalSpouses) {
      // Spouse's Parents
      const spouseParents = dataService.getParents(spouse.id);
      if (spouseParents.some(sp => sp.id === targetId)) {
        return isTargetMale
          ? { english: 'Father-in-law', tamil: 'மாமனார் (Mamanar)', tagText: 'Father-in-law • மாமனார்', relationType: 'inlaw' }
          : { english: 'Mother-in-law', tamil: 'மாமியார் (Mamiyar)', tagText: 'Mother-in-law • மாமியார்', relationType: 'inlaw' };
      }

      // Spouse's Siblings
      const spouseSiblings = dataService.getSiblings(spouse.id);
      if (spouseSiblings.some(ss => ss.id === targetId)) {
        if (isTargetMale) {
          return { english: 'Brother-in-law', tamil: 'மச்சான் / மைத்துனர் (Machan)', tagText: 'Brother-in-law • மச்சான்', relationType: 'inlaw' };
        } else {
          return focalGender === 'male'
            ? { english: 'Sister-in-law (Wife Sister)', tamil: 'கொழுந்தியாள் (Kozhunthiyal)', tagText: 'Sister-in-law • கொழுந்தியாள்', relationType: 'inlaw' }
            : { english: 'Sister-in-law (Husband Sister)', tamil: 'நாத்தனார் (Naathanar)', tagText: 'Sister-in-law • நாத்தனார்', relationType: 'inlaw' };
        }
      }

      // Spouse's Sister's Husband (Sagalai)
      for (const ss of spouseSiblings) {
        if (ss.gender === 'female') {
          const ssSpouses = dataService.getSpouses(ss.id);
          if (ssSpouses.some(sss => sss.id === targetId && isTargetMale)) {
            return { english: 'Co-Brother-in-law', tamil: 'சகலை (Sagalai)', tagText: 'Brother-in-law • சகலை', relationType: 'inlaw' };
          }
        }
      }
    }

    // 10. Sibling's Spouse (Brother-in-law / Sister-in-law)
    for (const sib of focalSiblings) {
      const sibSpouses = dataService.getSpouses(sib.id);
      if (sibSpouses.some(ss => ss.id === targetId)) {
        if (sib.gender === 'female') {
          // Sister's Husband -> Machan / Mappillai
          return { english: 'Brother-in-law (Sister Husband)', tamil: 'மச்சான் / மாப்பிள்ளை (Machan)', tagText: 'Brother-in-law • மச்சான்', relationType: 'inlaw' };
        } else {
          // Brother's Wife -> Anni
          return { english: 'Sister-in-law (Brother Wife)', tamil: 'அண்ணி (Anni)', tagText: 'Sister-in-law • அண்ணி', relationType: 'inlaw' };
        }
      }

      // Nieces and Nephews (Sibling's Children)
      const sibChildren = dataService.getChildren(sib.id);
      if (sibChildren.some(sc => sc.id === targetId)) {
        return isTargetMale
          ? { english: 'Nephew', tamil: 'மருமகன் (Marumagan)', tagText: 'Nephew • மருமகன்', relationType: 'descendant' }
          : { english: 'Niece', tamil: 'மருமகள் (Marumagal)', tagText: 'Niece • மருமகள்', relationType: 'descendant' };
      }
    }

    // 11. Cousins (Children of Parents' Siblings)
    for (const parent of focalParents) {
      const pSiblings = dataService.getSiblings(parent.id);
      for (const ps of pSiblings) {
        const cousins = dataService.getChildren(ps.id);
        if (cousins.some(c => c.id === targetId)) {
          const isCrossCousin = (parent.gender === 'male' && ps.gender === 'female') || (parent.gender === 'female' && ps.gender === 'male');
          if (isCrossCousin) {
            // Athai's Child or Mama's Child
            if (isTargetMale) {
              return { english: 'Cross-Cousin (Athai/Mama Son)', tamil: 'மச்சான் / மைத்துனன் (Machan)', tagText: 'Cousin • மச்சான்', relationType: 'cousin' };
            } else {
              return { english: 'Cross-Cousin (Athai/Mama Daughter)', tamil: 'அத்தை/மாமா மகள் (Athai/Mama Magal)', tagText: 'Cousin • அத்தை மகள்', relationType: 'cousin' };
            }
          } else {
            // Parallel Cousin (Periyappa / Chithappa / Periyamma / Chithi child)
            if (isTargetMale) {
              return isTargetOlder
                ? { english: 'Cousin (Elder Brother rank)', tamil: 'அண்ணன் முறை (Annan Murai)', tagText: 'Cousin • அண்ணன் முறை', relationType: 'cousin' }
                : { english: 'Cousin (Younger Brother rank)', tamil: 'தம்பி முறை (Thambi Murai)', tagText: 'Cousin • தம்பி முறை', relationType: 'cousin' };
            } else {
              return isTargetOlder
                ? { english: 'Cousin (Elder Sister rank)', tamil: 'அக்கா முறை (Akka Murai)', tagText: 'Cousin • அக்கா முறை', relationType: 'cousin' }
                : { english: 'Cousin (Younger Sister rank)', tamil: 'தங்கை முறை (Thangachi Murai)', tagText: 'Cousin • தங்கை முறை', relationType: 'cousin' };
            }
          }
        }
      }
    }

    // 12. Generational Fallback based on Generation Difference
    const genDiff = target.generation - focal.generation;
    if (genDiff === 0) {
      return { english: 'Same Generation Relative', tamil: 'சமகால உறவினர் (Relative)', tagText: 'Peer • உறவினர்', relationType: 'relative' };
    } else if (genDiff === -1) {
      return isTargetMale
        ? { english: 'Uncle / Elder Generation', tamil: 'பெரியவர் / மாமா முறை (Uncle)', tagText: 'Elder • மாமா / பெரியவர்', relationType: 'ancestor' }
        : { english: 'Aunt / Elder Generation', tamil: 'அத்தை / பெரியம்மா முறை (Aunt)', tagText: 'Elder • அத்தை / சித்தி', relationType: 'ancestor' };
    } else if (genDiff === 1) {
      return isTargetMale
        ? { english: 'Junior Generation / Nephew rank', tamil: 'மருமகன் / தம்பி முறை (Junior)', tagText: 'Junior • மருமகன்', relationType: 'descendant' }
        : { english: 'Junior Generation / Niece rank', tamil: 'மருமகள் / தங்கை முறை (Junior)', tagText: 'Junior • மருமகள்', relationType: 'descendant' };
    } else if (genDiff < -1) {
      return isTargetMale
        ? { english: `Ancestor (Tier ${target.generation})`, tamil: `முன்னோர் (${target.generation}-ஆம் தலைமுறை)`, tagText: `Ancestor • தாத்தா முறை`, relationType: 'ancestor' }
        : { english: `Ancestress (Tier ${target.generation})`, tamil: `முன்னோர் பாட்டி (${target.generation}-ஆம் தலைமுறை)`, tagText: `Ancestor • பாட்டி முறை`, relationType: 'ancestor' };
    } else {
      return { english: `Descendant (Gen ${target.generation})`, tamil: `வாரிசு / வழித்தோன்றல் (${target.generation}-ஆம் தலைமுறை)`, tagText: `Descendant • வழித்தோன்றல்`, relationType: 'descendant' };
    }
  }
}

export const kinshipService = new KinshipService();
