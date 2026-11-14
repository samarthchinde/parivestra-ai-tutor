"""Curriculum Loader, Schema Validator, and DAG Prerequisite Cycle Detector."""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("backend.curriculum")

CURRICULUM_DIR = Path("knowledge_base/curriculum")


def get_curriculum_path(board: str, grade: str, subject: str) -> Path:
    """Return path to curriculum JSON file, e.g. knowledge_base/curriculum/cbse/class9/science.json."""
    board_clean = board.lower().strip()
    digits = "".join(ch for ch in grade if ch.isdigit())
    grade_dir = f"class{digits}" if digits else grade.lower().replace(" ", "")
    subj_file = subject.lower().replace(" ", "_") + ".json"
    return CURRICULUM_DIR / board_clean / grade_dir / subj_file


def validate_curriculum(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validates curriculum data structure:
    - Required root fields (board, grade, subject, units)
    - Unique chapter IDs
    - All prerequisites must exist
    - No cycles in prerequisites (DAG check)
    Returns (is_valid, list_of_errors).
    """
    errors: List[str] = []

    for required_key in ["board", "grade", "subject", "units"]:
        if required_key not in data:
            errors.append(f"Missing required root field: '{required_key}'")

    if errors:
        return False, errors

    units = data.get("units", [])
    if not isinstance(units, list):
        errors.append("'units' must be a list")
        return False, errors

    chapter_map: Dict[str, Dict[str, Any]] = {}
    chapter_prereqs: Dict[str, List[str]] = {}

    for u_idx, unit in enumerate(units):
        if not isinstance(unit, dict):
            errors.append(f"Unit {u_idx} is not an object")
            continue
        if "id" not in unit or "title" not in unit:
            errors.append(f"Unit {u_idx} missing 'id' or 'title'")

        chapters = unit.get("chapters", [])
        if not isinstance(chapters, list):
            errors.append(f"Unit '{unit.get('title')}' chapters must be a list")
            continue

        for c_idx, chap in enumerate(chapters):
            if not isinstance(chap, dict):
                errors.append(f"Chapter {c_idx} in Unit '{unit.get('title')}' is not an object")
                continue

            chap_id = chap.get("id")
            if not chap_id:
                errors.append(f"Chapter at index {c_idx} in Unit '{unit.get('title')}' missing 'id'")
                continue

            if chap_id in chapter_map:
                errors.append(f"Duplicate chapter ID found: '{chap_id}'")
            chapter_map[chap_id] = chap

            prereqs = chap.get("prerequisites", [])
            if not isinstance(prereqs, list):
                errors.append(f"Chapter '{chap_id}' prerequisites must be a list")
            else:
                chapter_prereqs[chap_id] = prereqs

    # Validate that all prerequisite chapter IDs exist
    for chap_id, prereqs in chapter_prereqs.items():
        for prereq_id in prereqs:
            if prereq_id not in chapter_map:
                errors.append(f"Chapter '{chap_id}' has non-existent prerequisite: '{prereq_id}'")

    # DAG Cycle Detection via DFS (3-color cycle detection)
    # 0 = unvisited, 1 = visiting (in current recursion stack), 2 = visited
    state: Dict[str, int] = {cid: 0 for cid in chapter_map}

    def has_cycle(cid: str, path: List[str]) -> bool:
        state[cid] = 1
        for prereq in chapter_prereqs.get(cid, []):
            if prereq in state:
                if state[prereq] == 1:
                    cycle_str = " -> ".join(path + [prereq])
                    errors.append(f"Prerequisite cycle detected: {cycle_str}")
                    return True
                if state[prereq] == 0:
                    if has_cycle(prereq, path + [prereq]):
                        return True
        state[cid] = 2
        return False

    for cid in chapter_map:
        if state[cid] == 0:
            if has_cycle(cid, [cid]):
                break

    is_valid = len(errors) == 0
    return is_valid, errors


def load_curriculum(board: str = "cbse", grade: str = "Class 3", subject: Optional[str] = None) -> List[Dict[str, Any]]:
    """Load curriculum definitions for board/grade. If subject is None, loads all subjects."""
    board_clean = board.lower().strip()
    digits = "".join(ch for ch in grade if ch.isdigit())
    grade_dir = f"class{digits}" if digits else grade.lower().replace(" ", "")

    target_dir = CURRICULUM_DIR / board_clean / grade_dir
    if not target_dir.exists():
        logger.warning(f"Curriculum directory not found: {target_dir}")
        return []

    results = []
    if subject:
        subj_file = target_dir / (subject.lower().replace(" ", "_") + ".json")
        if subj_file.exists():
            try:
                with open(subj_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    valid, errs = validate_curriculum(data)
                    if valid:
                        results.append(data)
                    else:
                        logger.error(f"Validation errors in {subj_file}: {errs}")
            except Exception as e:
                logger.error(f"Failed to read curriculum file {subj_file}: {e}")
    else:
        for json_path in target_dir.glob("*.json"):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    valid, errs = validate_curriculum(data)
                    if valid:
                        results.append(data)
                    else:
                        logger.error(f"Validation errors in {json_path}: {errs}")
            except Exception as e:
                logger.error(f"Failed to read curriculum file {json_path}: {e}")

    return results


def get_chapters_for_learning_path(board: str, grade: str, subject: str = "Maths") -> List[Dict[str, Any]]:
    """Extracts all chapters from the curriculum and returns them topologically sorted in prerequisite order."""
    curricula = load_curriculum(board=board, grade=grade, subject=subject)
    if not curricula:
        return []

    curr = curricula[0]
    all_chapters: Dict[str, Dict[str, Any]] = {}
    for unit in curr.get("units", []):
        for chap in unit.get("chapters", []):
            chap_copy = dict(chap)
            chap_copy["unit_id"] = unit.get("id")
            chap_copy["unit_title"] = unit.get("title")
            all_chapters[chap["id"]] = chap_copy

    # Topological sort (Kahn's algorithm)
    in_degree: Dict[str, int] = {cid: 0 for cid in all_chapters}
    graph: Dict[str, List[str]] = {cid: [] for cid in all_chapters}

    for cid, chap in all_chapters.items():
        prereqs = chap.get("prerequisites", [])
        for p in prereqs:
            if p in graph:
                graph[p].append(cid)
                in_degree[cid] += 1

    queue = [cid for cid, deg in in_degree.items() if deg == 0]
    ordered: List[Dict[str, Any]] = []

    while queue:
        curr_id = queue.pop(0)
        ordered.append(all_chapters[curr_id])
        for neighbor in graph.get(curr_id, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # In case of any disconnected items or fallback
    if len(ordered) < len(all_chapters):
        for cid, chap in all_chapters.items():
            if chap not in ordered:
                ordered.append(chap)

    return ordered

