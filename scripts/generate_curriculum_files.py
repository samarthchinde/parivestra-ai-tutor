"""Generate standard CBSE curriculum JSON files for Classes 3 through 10 with learning objectives and prerequisites."""
import json
from pathlib import Path

BASE_DIR = Path("knowledge_base/curriculum/cbse")


CURRICULUM_DATA = {
    # ----------------------------------------------------
    # JUNIOR BAND (Classes 3 to 5)
    # ----------------------------------------------------
    "class3": {
        "maths": {
            "board": "CBSE", "grade": "Class 3", "subject": "Maths",
            "units": [
                {
                    "id": "c3_maths_u1", "title": "Number Sense & Computation",
                    "chapters": [
                        {
                            "id": "c3_maths_ch01", "chapter_number": 1, "title": "Where to Look From",
                            "learning_objectives": ["Identify top, side and front views of everyday objects", "Understand symmetry and patterns"],
                            "prerequisites": [], "keywords": ["views", "shapes", "symmetry", "grid"], "needs_review": True
                        },
                        {
                            "id": "c3_maths_ch02", "chapter_number": 2, "title": "Fun with Numbers",
                            "learning_objectives": ["Read and write 3-digit numbers up to 999", "Understand place value (hundreds, tens, ones)"],
                            "prerequisites": ["c3_maths_ch01"], "keywords": ["place value", "hundreds", "expanded form"], "needs_review": True
                        },
                        {
                            "id": "c3_maths_ch03", "chapter_number": 3, "title": "Give and Take",
                            "learning_objectives": ["Mental addition and subtraction of 2-digit and 3-digit numbers", "Solve real-world word problems"],
                            "prerequisites": ["c3_maths_ch02"], "keywords": ["addition", "subtraction", "carrying", "borrowing"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c3_maths_u2", "title": "Measurement & Shapes",
                    "chapters": [
                        {
                            "id": "c3_maths_ch04", "chapter_number": 4, "title": "Long and Short",
                            "learning_objectives": ["Measure lengths using non-standard and standard units (cm, m)", "Estimate distances"],
                            "prerequisites": [], "keywords": ["length", "centimetres", "metres", "ruler"], "needs_review": True
                        },
                        {
                            "id": "c3_maths_ch05", "chapter_number": 5, "title": "Shapes and Designs",
                            "learning_objectives": ["Identify 2D shapes (triangle, rectangle, circle)", "Count edges and corners"],
                            "prerequisites": ["c3_maths_ch04"], "keywords": ["edges", "corners", "tangram", "tiling"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 3", "subject": "English",
            "units": [
                {
                    "id": "c3_eng_u1", "title": "Foundational Grammar & Vocabulary",
                    "chapters": [
                        {
                            "id": "c3_eng_ch01", "chapter_number": 1, "title": "Naming Words (Nouns)",
                            "learning_objectives": ["Identify common and proper nouns", "Distinguish singular and plural nouns"],
                            "prerequisites": [], "keywords": ["nouns", "people", "places", "things", "plurals"], "needs_review": True
                        },
                        {
                            "id": "c3_eng_ch02", "chapter_number": 2, "title": "Action Words (Verbs)",
                            "learning_objectives": ["Recognize doing words in sentences", "Use simple present tense"],
                            "prerequisites": ["c3_eng_ch01"], "keywords": ["verbs", "action", "doing words", "tense"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "evs": {
            "board": "CBSE", "grade": "Class 3", "subject": "EVS",
            "units": [
                {
                    "id": "c3_evs_u1", "title": "Plants & Animals Around Us",
                    "chapters": [
                        {
                            "id": "c3_evs_ch01", "chapter_number": 1, "title": "Poonam's Day Out",
                            "learning_objectives": ["Observe and categorize animals by movement and habitat", "Recognize animal sounds"],
                            "prerequisites": [], "keywords": ["animals", "birds", "insects", "habitat"], "needs_review": True
                        },
                        {
                            "id": "c3_evs_ch02", "chapter_number": 2, "title": "The Plant Fairy",
                            "learning_objectives": ["Identify parts of a plant (roots, stem, leaves, flowers)", "Differentiate trees, shrubs, and herbs"],
                            "prerequisites": [], "keywords": ["leaves", "roots", "chlorophyll", "bark"], "needs_review": True
                        },
                        {
                            "id": "c3_evs_ch03", "chapter_number": 3, "title": "Water O' Water!",
                            "learning_objectives": ["Identify sources of freshwater", "Understand the basics of rain and conservation"],
                            "prerequisites": [], "keywords": ["water cycle", "rain", "river", "conservation"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    "class4": {
        "maths": {
            "board": "CBSE", "grade": "Class 4", "subject": "Maths",
            "units": [
                {
                    "id": "c4_maths_u1", "title": "Large Numbers & Operations",
                    "chapters": [
                        {
                            "id": "c4_maths_ch01", "chapter_number": 1, "title": "Building with Bricks",
                            "learning_objectives": ["Recognize 3D architectural brick patterns", "Read and write numbers up to 10,000"],
                            "prerequisites": [], "keywords": ["patterns", "3D shapes", "thousands"], "needs_review": True
                        },
                        {
                            "id": "c4_maths_ch02", "chapter_number": 2, "title": "Long and Short Distances",
                            "learning_objectives": ["Convert metres to kilometres and centimetres", "Calculate perimeter basics"],
                            "prerequisites": ["c4_maths_ch01"], "keywords": ["kilometre", "metre", "conversion"], "needs_review": True
                        },
                        {
                            "id": "c4_maths_ch03", "chapter_number": 3, "title": "A Trip to Bhopal",
                            "learning_objectives": ["Apply multiplication and division to travel and distance problems", "Time estimation"],
                            "prerequisites": ["c4_maths_ch02"], "keywords": ["multiplication", "division", "estimation"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c4_maths_u2", "title": "Fractions and Parts",
                    "chapters": [
                        {
                            "id": "c4_maths_ch04", "chapter_number": 4, "title": "Halves and Quarters",
                            "learning_objectives": ["Understand fractional parts (1/2, 1/4, 3/4) of a whole and collection", "Equivalent fractions introduction"],
                            "prerequisites": ["c4_maths_ch01"], "keywords": ["fraction", "half", "quarter", "numerator", "denominator"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 4", "subject": "English",
            "units": [
                {
                    "id": "c4_eng_u1", "title": "Sentence Building & Descriptive Writing",
                    "chapters": [
                        {
                            "id": "c4_eng_ch01", "chapter_number": 1, "title": "Describing Words (Adjectives)",
                            "learning_objectives": ["Identify adjectives describing size, colour, number, quality", "Form comparative adjectives"],
                            "prerequisites": [], "keywords": ["adjectives", "description", "comparison"], "needs_review": True
                        },
                        {
                            "id": "c4_eng_ch02", "chapter_number": 2, "title": "Pronouns & Connecting Words",
                            "learning_objectives": ["Use personal pronouns (he, she, it, they)", "Connect sentences using 'and', 'but', 'because'"],
                            "prerequisites": ["c4_eng_ch01"], "keywords": ["pronouns", "conjunctions", "cohesion"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "evs": {
            "board": "CBSE", "grade": "Class 4", "subject": "EVS",
            "units": [
                {
                    "id": "c4_evs_u1", "title": "Living Environment & Adaptations",
                    "chapters": [
                        {
                            "id": "c4_evs_ch01", "chapter_number": 1, "title": "Going to School",
                            "learning_objectives": ["Explore transportation modes across diverse terrains in India", "Understand bridge structures"],
                            "prerequisites": [], "keywords": ["transport", "terrain", "bridges"], "needs_review": True
                        },
                        {
                            "id": "c4_evs_ch02", "chapter_number": 2, "title": "Ear to Ear",
                            "learning_objectives": ["Classify animals with visible ears vs hidden ears", "Understand viviparous vs oviparous animals"],
                            "prerequisites": [], "keywords": ["ears", "mammals", "eggs", "fur"], "needs_review": True
                        },
                        {
                            "id": "c4_evs_ch03", "chapter_number": 3, "title": "A Day with Nandu",
                            "learning_objectives": ["Understand herd behaviour and social structure of elephants", "Ecosystem protection"],
                            "prerequisites": ["c4_evs_ch02"], "keywords": ["elephants", "herds", "ecosystem"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    "class5": {
        "maths": {
            "board": "CBSE", "grade": "Class 5", "subject": "Maths",
            "units": [
                {
                    "id": "c5_maths_u1", "title": "Number Systems & Geometry",
                    "chapters": [
                        {
                            "id": "c5_maths_ch01", "chapter_number": 1, "title": "The Fish Tale",
                            "learning_objectives": ["Understand numbers up to Lakhs and Crores", "Speed, distance, time word problems"],
                            "prerequisites": [], "keywords": ["lakh", "crore", "large numbers", "speed"], "needs_review": True
                        },
                        {
                            "id": "c5_maths_ch02", "chapter_number": 2, "title": "Shapes and Angles",
                            "learning_objectives": ["Recognize right, acute, and obtuse angles", "Measure angles with a protractor"],
                            "prerequisites": ["c5_maths_ch01"], "keywords": ["angles", "right angle", "protractor", "degrees"], "needs_review": True
                        },
                        {
                            "id": "c5_maths_ch03", "chapter_number": 3, "title": "How Many Squares? (Area & Perimeter)",
                            "learning_objectives": ["Calculate perimeter of polygons", "Calculate area of squares and rectangles on a grid"],
                            "prerequisites": ["c5_maths_ch02"], "keywords": ["area", "perimeter", "square units"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 5", "subject": "English",
            "units": [
                {
                    "id": "c5_eng_u1", "title": "Grammar, Tenses & Comprehension",
                    "chapters": [
                        {
                            "id": "c5_eng_ch01", "chapter_number": 1, "title": "Tenses: Past, Present, and Future",
                            "learning_objectives": ["Use simple and continuous tenses accurately", "Identify irregular past tense verbs"],
                            "prerequisites": [], "keywords": ["tenses", "past tense", "future tense", "continuous"], "needs_review": True
                        },
                        {
                            "id": "c5_eng_ch02", "chapter_number": 2, "title": "Prepositions and Adverbs",
                            "learning_objectives": ["Identify adverbs of manner, place, and time", "Use position prepositions correctly"],
                            "prerequisites": ["c5_eng_ch01"], "keywords": ["adverbs", "prepositions", "manner", "time"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "evs": {
            "board": "CBSE", "grade": "Class 5", "subject": "EVS",
            "units": [
                {
                    "id": "c5_evs_u1", "title": "Animal Senses, Food & Health",
                    "chapters": [
                        {
                            "id": "c5_evs_ch01", "chapter_number": 1, "title": "Super Senses",
                            "learning_objectives": ["Explore extraordinary sight, smell, and hearing in wildlife", "Nocturnal animals"],
                            "prerequisites": [], "keywords": ["senses", "smell", "hearing", "ant trails", "echolocation"], "needs_review": True
                        },
                        {
                            "id": "c5_evs_ch02", "chapter_number": 2, "title": "From Tasting to Digesting",
                            "learning_objectives": ["Understand the tongue's taste zones", "Trace the human digestive system path"],
                            "prerequisites": ["c5_evs_ch01"], "keywords": ["digestion", "stomach", "saliva", "balanced diet"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    # ----------------------------------------------------
    # MIDDLE BAND (Classes 6 to 8)
    # ----------------------------------------------------
    "class6": {
        "maths": {
            "board": "CBSE", "grade": "Class 6", "subject": "Maths",
            "units": [
                {
                    "id": "c6_maths_u1", "title": "Number Systems & Algebra",
                    "chapters": [
                        {
                            "id": "c6_maths_ch01", "chapter_number": 1, "title": "Knowing Our Numbers",
                            "learning_objectives": ["Indian and International numeration systems", "Roman numerals and estimation"],
                            "prerequisites": [], "keywords": ["place value", "international system", "roman numerals"], "needs_review": True
                        },
                        {
                            "id": "c6_maths_ch02", "chapter_number": 2, "title": "Whole Numbers",
                            "learning_objectives": ["Number line properties", "Additive and multiplicative identities"],
                            "prerequisites": ["c6_maths_ch01"], "keywords": ["natural numbers", "whole numbers", "closure"], "needs_review": True
                        },
                        {
                            "id": "c6_maths_ch03", "chapter_number": 3, "title": "Playing with Numbers (Factors & Multiples)",
                            "learning_objectives": ["Find Prime and Composite numbers", "Compute HCF and LCM using prime factorization"],
                            "prerequisites": ["c6_maths_ch02"], "keywords": ["factors", "multiples", "HCF", "LCM", "prime"], "needs_review": True
                        },
                        {
                            "id": "c6_maths_ch04", "chapter_number": 4, "title": "Integers",
                            "learning_objectives": ["Represent positive and negative numbers on the number line", "Add and subtract integers"],
                            "prerequisites": ["c6_maths_ch02"], "keywords": ["integers", "negative numbers", "number line"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "science": {
            "board": "CBSE", "grade": "Class 6", "subject": "Science",
            "units": [
                {
                    "id": "c6_sci_u1", "title": "Food, Materials & Living World",
                    "chapters": [
                        {
                            "id": "c6_sci_ch01", "chapter_number": 1, "title": "Components of Food",
                            "learning_objectives": ["Identify carbohydrates, proteins, fats, vitamins, and minerals", "Recognize deficiency diseases"],
                            "prerequisites": [], "keywords": ["nutrients", "proteins", "vitamins", "scurvy", "rickets"], "needs_review": True
                        },
                        {
                            "id": "c6_sci_ch02", "chapter_number": 2, "title": "Sorting Materials into Groups",
                            "learning_objectives": ["Classify objects by lustre, hardness, solubility, and transparency", "Density and buoyancy"],
                            "prerequisites": [], "keywords": ["transparent", "translucent", "opaque", "solubility"], "needs_review": True
                        },
                        {
                            "id": "c6_sci_ch03", "chapter_number": 3, "title": "Separation of Substances",
                            "learning_objectives": ["Methods: handpicking, winnowing, sieving, sedimentation, filtration", "Evaporation and condensation"],
                            "prerequisites": ["c6_sci_ch02"], "keywords": ["filtration", "decantation", "solution", "solute"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 6", "subject": "English",
            "units": [
                {
                    "id": "c6_eng_u1", "title": "Grammar & Sentence Structures",
                    "chapters": [
                        {
                            "id": "c6_eng_ch01", "chapter_number": 1, "title": "Types of Sentences & Clauses",
                            "learning_objectives": ["Assertive, interrogative, imperative, exclamatory sentences", "Subject-verb agreement"],
                            "prerequisites": [], "keywords": ["syntax", "predicate", "subject", "clause"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "social_science": {
            "board": "CBSE", "grade": "Class 6", "subject": "Social Science",
            "units": [
                {
                    "id": "c6_soc_u1", "title": "Our Past, Earth & Society",
                    "chapters": [
                        {
                            "id": "c6_soc_ch01", "chapter_number": 1, "title": "What, Where, How and When? (Early Humans)",
                            "learning_objectives": ["Archaeological sources and manuscripts", "Hunter-gatherers along river valleys"],
                            "prerequisites": [], "keywords": ["archaeology", "manuscripts", "inscriptions"], "needs_review": True
                        },
                        {
                            "id": "c6_soc_ch02", "chapter_number": 2, "title": "The Earth in the Solar System",
                            "learning_objectives": ["Planets, celestial bodies, constellations", "Earth as a unique planet"],
                            "prerequisites": [], "keywords": ["solar system", "planets", "orbit", "satellite"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    "class7": {
        "maths": {
            "board": "CBSE", "grade": "Class 7", "subject": "Maths",
            "units": [
                {
                    "id": "c7_maths_u1", "title": "Number Operations & Equations",
                    "chapters": [
                        {
                            "id": "c7_maths_ch01", "chapter_number": 1, "title": "Integers Operations & Properties",
                            "learning_objectives": ["Multiplication and division of integers", "Distributive property"],
                            "prerequisites": [], "keywords": ["integers", "distributive property", "signs"], "needs_review": True
                        },
                        {
                            "id": "c7_maths_ch02", "chapter_number": 2, "title": "Fractions and Decimals",
                            "learning_objectives": ["Multiplication and division of fractions and decimals", "Reciprocals and place value"],
                            "prerequisites": ["c7_maths_ch01"], "keywords": ["decimals", "fractions", "reciprocal"], "needs_review": True
                        },
                        {
                            "id": "c7_maths_ch03", "chapter_number": 3, "title": "Simple Linear Equations",
                            "learning_objectives": ["Form linear equations in one variable", "Solve equations by balancing and transposition"],
                            "prerequisites": ["c7_maths_ch02"], "keywords": ["variables", "constants", "equations", "transposition"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "science": {
            "board": "CBSE", "grade": "Class 7", "subject": "Science",
            "units": [
                {
                    "id": "c7_sci_u1", "title": "Life Processes & Energy",
                    "chapters": [
                        {
                            "id": "c7_sci_ch01", "chapter_number": 1, "title": "Nutrition in Plants",
                            "learning_objectives": ["Autotrophic vs heterotrophic nutrition", "Photosynthesis mechanism and stomata"],
                            "prerequisites": [], "keywords": ["photosynthesis", "stomata", "chlorophyll", "saprotrophs"], "needs_review": True
                        },
                        {
                            "id": "c7_sci_ch02", "chapter_number": 2, "title": "Heat and Temperature",
                            "learning_objectives": ["Conduction, convection, and radiation", "Clinical vs laboratory thermometers"],
                            "prerequisites": [], "keywords": ["heat", "temperature", "conduction", "convection", "radiation"], "needs_review": True
                        },
                        {
                            "id": "c7_sci_ch03", "chapter_number": 3, "title": "Acids, Bases and Salts",
                            "learning_objectives": ["Litmus, turmeric, and phenolphthalein indicators", "Neutralization reactions in daily life"],
                            "prerequisites": [], "keywords": ["acids", "bases", "indicators", "neutralization"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 7", "subject": "English",
            "units": [
                {
                    "id": "c7_eng_u1", "title": "Advanced Grammar & Voice",
                    "chapters": [
                        {
                            "id": "c7_eng_ch01", "chapter_number": 1, "title": "Active and Passive Voice",
                            "learning_objectives": ["Transform active to passive voice across tenses", "Identify agent and object"],
                            "prerequisites": [], "keywords": ["voice", "active", "passive", "past participle"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "social_science": {
            "board": "CBSE", "grade": "Class 7", "subject": "Social Science",
            "units": [
                {
                    "id": "c7_soc_u1", "title": "Environment, Kings & Democracy",
                    "chapters": [
                        {
                            "id": "c7_soc_ch01", "chapter_number": 1, "title": "Our Environment (Biosphere & Ecosystem)",
                            "learning_objectives": ["Biotic and abiotic components", "Lithosphere, hydrosphere, atmosphere, biosphere"],
                            "prerequisites": [], "keywords": ["environment", "biosphere", "ecosystem"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    "class8": {
        "maths": {
            "board": "CBSE", "grade": "Class 8", "subject": "Maths",
            "units": [
                {
                    "id": "c8_maths_u1", "title": "Rational Numbers, Algebra & Mensuration",
                    "chapters": [
                        {
                            "id": "c8_maths_ch01", "chapter_number": 1, "title": "Rational Numbers",
                            "learning_objectives": ["Closure, commutativity, and associativity of rational numbers", "Representation on the number line"],
                            "prerequisites": [], "keywords": ["rational numbers", "closure", "associative"], "needs_review": True
                        },
                        {
                            "id": "c8_maths_ch02", "chapter_number": 2, "title": "Linear Equations in One Variable",
                            "learning_objectives": ["Solve linear equations with variables on both sides", "Word problems on ages, perimeters, coins"],
                            "prerequisites": ["c8_maths_ch01"], "keywords": ["linear equations", "variables", "balancing"], "needs_review": True
                        },
                        {
                            "id": "c8_maths_ch03", "chapter_number": 3, "title": "Squares and Square Roots",
                            "learning_objectives": ["Prime factorization and division method for square roots", "Pythagorean triplets"],
                            "prerequisites": ["c8_maths_ch01"], "keywords": ["square roots", "perfect squares", "pythagorean triplets"], "needs_review": True
                        },
                        {
                            "id": "c8_maths_ch04", "chapter_number": 4, "title": "Algebraic Expressions & Identities",
                            "learning_objectives": ["Polynomial addition, subtraction, multiplication", "Standard identities (a+b)^2, (a-b)^2, (a^2-b^2)"],
                            "prerequisites": ["c8_maths_ch02"], "keywords": ["polynomials", "identities", "factorization"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "science": {
            "board": "CBSE", "grade": "Class 8", "subject": "Science",
            "units": [
                {
                    "id": "c8_sci_u1", "title": "Microorganisms, Materials & Forces",
                    "chapters": [
                        {
                            "id": "c8_sci_ch01", "chapter_number": 1, "title": "Crop Production and Management",
                            "learning_objectives": ["Agricultural practices: tilling, sowing, manure, irrigation, harvesting", "Kharif and Rabi crops"],
                            "prerequisites": [], "keywords": ["agriculture", "irrigation", "crops", "fertilizers"], "needs_review": True
                        },
                        {
                            "id": "c8_sci_ch02", "chapter_number": 2, "title": "Microorganisms: Friend and Foe",
                            "learning_objectives": ["Bacteria, fungi, protozoa, algae, viruses", "Antibiotics, vaccines, food preservation"],
                            "prerequisites": [], "keywords": ["microbes", "bacteria", "fermentation", "vaccines"], "needs_review": True
                        },
                        {
                            "id": "c8_sci_ch03", "chapter_number": 3, "title": "Force and Pressure",
                            "learning_objectives": ["Contact and non-contact forces", "Atmospheric pressure and liquid pressure"],
                            "prerequisites": [], "keywords": ["force", "gravity", "friction", "pressure", "pascals"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 8", "subject": "English",
            "units": [
                {
                    "id": "c8_eng_u1", "title": "Clauses, Reported Speech & Writing",
                    "chapters": [
                        {
                            "id": "c8_eng_ch01", "chapter_number": 1, "title": "Direct and Indirect Speech",
                            "learning_objectives": ["Rules for changing tense, pronouns, and adverbs in reporting", "Reporting questions and commands"],
                            "prerequisites": [], "keywords": ["reported speech", "indirect speech", "reporting verb"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "social_science": {
            "board": "CBSE", "grade": "Class 8", "subject": "Social Science",
            "units": [
                {
                    "id": "c8_soc_u1", "title": "Modern History & Indian Constitution",
                    "chapters": [
                        {
                            "id": "c8_soc_ch01", "chapter_number": 1, "title": "The Indian Constitution & Secularism",
                            "learning_objectives": ["Fundamental Rights and Directive Principles", "Key features: Federalism, Parliamentary system, Separation of powers"],
                            "prerequisites": [], "keywords": ["constitution", "fundamental rights", "secularism", "democracy"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    # ----------------------------------------------------
    # SENIOR BAND (Classes 9 to 10 - CBSE Board Track)
    # ----------------------------------------------------
    "class9": {
        "maths": {
            "board": "CBSE", "grade": "Class 9", "subject": "Maths",
            "units": [
                {
                    "id": "c9_maths_u1", "title": "Number Systems & Polynomials",
                    "chapters": [
                        {
                            "id": "c9_maths_ch01", "chapter_number": 1, "title": "Number Systems (Real Numbers)",
                            "learning_objectives": ["Irrational numbers on the real line", "Rationalizing denominators and laws of exponents"],
                            "prerequisites": [], "keywords": ["real numbers", "irrational", "rationalization", "exponents"], "needs_review": True
                        },
                        {
                            "id": "c9_maths_ch02", "chapter_number": 2, "title": "Polynomials",
                            "learning_objectives": ["Remainder theorem and Factor theorem", "Algebraic identities and cubic factorization"],
                            "prerequisites": ["c9_maths_ch01"], "keywords": ["polynomials", "factor theorem", "zeroes", "identities"], "needs_review": True
                        },
                        {
                            "id": "c9_maths_ch03", "chapter_number": 3, "title": "Coordinate Geometry",
                            "learning_objectives": ["Cartesian plane, coordinates, quadrants", "Plotting points on the axes"],
                            "prerequisites": ["c9_maths_ch01"], "keywords": ["cartesian plane", "abscissa", "ordinate", "quadrants"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c9_maths_u2", "title": "Geometry & Mensuration",
                    "chapters": [
                        {
                            "id": "c9_maths_ch04", "chapter_number": 4, "title": "Lines and Angles",
                            "learning_objectives": ["Axioms and theorems for parallel lines with a transversal", "Angle sum property of a triangle"],
                            "prerequisites": ["c9_maths_ch03"], "keywords": ["parallel lines", "transversal", "alternate interior angles"], "needs_review": True
                        },
                        {
                            "id": "c9_maths_ch05", "chapter_number": 5, "title": "Triangles (Congruence Theorems)",
                            "learning_objectives": ["Criteria for congruence: SAS, ASA, AAS, SSS, RHS", "Properties of isosceles triangles"],
                            "prerequisites": ["c9_maths_ch04"], "keywords": ["congruence", "SAS", "SSS", "RHS", "isosceles"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "science": {
            "board": "CBSE", "grade": "Class 9", "subject": "Science",
            "units": [
                {
                    "id": "c9_sci_u1", "title": "Chemistry: Matter & Atoms", "sub_discipline": "Chemistry",
                    "chapters": [
                        {
                            "id": "c9_chem_ch01", "chapter_number": 1, "title": "Matter in Our Surroundings",
                            "learning_objectives": ["Kinetic theory of matter and states of matter", "Evaporation, latent heat, and factors affecting rate"],
                            "prerequisites": [], "keywords": ["matter", "diffusion", "latent heat", "evaporation", "sublimation"], "needs_review": True
                        },
                        {
                            "id": "c9_chem_ch02", "chapter_number": 2, "title": "Is Matter Around Us Pure?",
                            "learning_objectives": ["Elements, compounds, mixtures, solutions, colloids, and suspensions", "Physical vs chemical changes"],
                            "prerequisites": ["c9_chem_ch01"], "keywords": ["colloid", "suspension", "tyndall effect", "solubility"], "needs_review": True
                        },
                        {
                            "id": "c9_chem_ch03", "chapter_number": 3, "title": "Atoms and Molecules",
                            "learning_objectives": ["Laws of chemical combination (Mass & Proportions)", "Atomic mass, molecular mass, and chemical formula writing"],
                            "prerequisites": ["c9_chem_ch02"], "keywords": ["atomic mass", "molecules", "valency", "chemical formula"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c9_sci_u2", "title": "Physics: Motion, Force & Gravitation", "sub_discipline": "Physics",
                    "chapters": [
                        {
                            "id": "c9_phys_ch01", "chapter_number": 4, "title": "Motion (Kinematics)",
                            "learning_objectives": ["Distance, displacement, velocity, acceleration", "Three equations of motion and graphical analysis"],
                            "prerequisites": [], "keywords": ["motion", "displacement", "acceleration", "velocity-time graph"], "needs_review": True
                        },
                        {
                            "id": "c9_phys_ch02", "chapter_number": 5, "title": "Force and Newton's Laws of Motion",
                            "learning_objectives": ["Inertia, momentum, Newton's 3 laws", "Conservation of momentum derivations"],
                            "prerequisites": ["c9_phys_ch01"], "keywords": ["newton's laws", "inertia", "momentum", "f=ma"], "needs_review": True
                        },
                        {
                            "id": "c9_phys_ch03", "chapter_number": 6, "title": "Gravitation",
                            "learning_objectives": ["Universal Law of Gravitation (G vs g)", "Mass vs weight and Archimedes' principle"],
                            "prerequisites": ["c9_phys_ch02"], "keywords": ["gravitation", "free fall", "weight", "buoyancy"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c9_sci_u3", "title": "Biology: Cell & Tissues", "sub_discipline": "Biology",
                    "chapters": [
                        {
                            "id": "c9_bio_ch01", "chapter_number": 7, "title": "The Fundamental Unit of Life (Cell)",
                            "learning_objectives": ["Prokaryotic vs eukaryotic cells", "Organelles: Mitochondria, Endoplasmic Reticulum, Golgi, Nucleus"],
                            "prerequisites": [], "keywords": ["cell", "mitochondria", "osmosis", "nucleus", "plasma membrane"], "needs_review": True
                        },
                        {
                            "id": "c9_bio_ch02", "chapter_number": 8, "title": "Tissues",
                            "learning_objectives": ["Plant tissues (meristematic & permanent)", "Animal tissues (epithelial, connective, muscular, nervous)"],
                            "prerequisites": ["c9_bio_ch01"], "keywords": ["xylem", "phloem", "meristem", "neuron", "connective tissue"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 9", "subject": "English",
            "units": [
                {
                    "id": "c9_eng_u1", "title": "Grammar, Modals & Formal Writing",
                    "chapters": [
                        {
                            "id": "c9_eng_ch01", "chapter_number": 1, "title": "Modals, Determiners & Concord",
                            "learning_objectives": ["Use modal auxiliaries (must, should, ought, could)", "Subject-verb concord rules"],
                            "prerequisites": [], "keywords": ["modals", "determiners", "concord"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "social_science": {
            "board": "CBSE", "grade": "Class 9", "subject": "Social Science",
            "units": [
                {
                    "id": "c9_soc_u1", "title": "Democracy, History & Economics",
                    "chapters": [
                        {
                            "id": "c9_soc_ch01", "chapter_number": 1, "title": "What is Democracy? Why Democracy?",
                            "learning_objectives": ["Key features of democratic governance", "Arguments for and against democracy"],
                            "prerequisites": [], "keywords": ["democracy", "elections", "constitution", "rule of law"], "needs_review": True
                        },
                        {
                            "id": "c9_soc_ch02", "chapter_number": 2, "title": "India: Size and Location (Geography)",
                            "learning_objectives": ["Latitudinal and longitudinal extent of India", "Standard Meridian and neighbouring countries"],
                            "prerequisites": [], "keywords": ["latitude", "longitude", "standard meridian", "indian ocean"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    },

    "class10": {
        "maths": {
            "board": "CBSE", "grade": "Class 10", "subject": "Maths",
            "units": [
                {
                    "id": "c10_maths_u1", "title": "Algebra & Quadratic Equations",
                    "chapters": [
                        {
                            "id": "c10_maths_ch01", "chapter_number": 1, "title": "Real Numbers (Fundamental Theorem of Arithmetic)",
                            "learning_objectives": ["Prove irrationality of sqrt(2), sqrt(3), sqrt(5)", "HCF and LCM via prime factorization"],
                            "prerequisites": [], "keywords": ["fundamental theorem", "irrationality proof", "coprimes"], "needs_review": True
                        },
                        {
                            "id": "c10_maths_ch02", "chapter_number": 2, "title": "Polynomials (Zeroes & Coefficients)",
                            "learning_objectives": ["Relationship between zeroes and coefficients of quadratic polynomials", "Geometric meaning of zeroes"],
                            "prerequisites": ["c10_maths_ch01"], "keywords": ["quadratic", "zeroes", "alpha beta", "coefficients"], "needs_review": True
                        },
                        {
                            "id": "c10_maths_ch03", "chapter_number": 3, "title": "Pair of Linear Equations in Two Variables",
                            "learning_objectives": ["Graphical method and consistency conditions", "Substitution and elimination methods"],
                            "prerequisites": ["c10_maths_ch02"], "keywords": ["linear equations", "elimination", "substitution", "consistency"], "needs_review": True
                        },
                        {
                            "id": "c10_maths_ch04", "chapter_number": 4, "title": "Quadratic Equations",
                            "learning_objectives": ["Roots of quadratic equations by factorization and quadratic formula", "Nature of roots via discriminant"],
                            "prerequisites": ["c10_maths_ch02"], "keywords": ["quadratic formula", "discriminant", "real roots"], "needs_review": True
                        },
                        {
                            "id": "c10_maths_ch05", "chapter_number": 5, "title": "Arithmetic Progressions (AP)",
                            "learning_objectives": ["nth term of an AP formula: a_n = a + (n-1)d", "Sum of first n terms formula: S_n = n/2[2a + (n-1)d]"],
                            "prerequisites": ["c10_maths_ch01"], "keywords": ["arithmetic progression", "common difference", "nth term", "sum"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c10_maths_u2", "title": "Trigonometry & Geometry",
                    "chapters": [
                        {
                            "id": "c10_maths_ch06", "chapter_number": 6, "title": "Introduction to Trigonometry",
                            "learning_objectives": ["Trigonometric ratios of acute angles (sin, cos, tan, cosec, sec, cot)", "Values at 0, 30, 45, 60, 90 degrees and sin^2+cos^2=1 identity"],
                            "prerequisites": ["c10_maths_ch01"], "keywords": ["trigonometry", "sin", "cos", "tan", "identities"], "needs_review": True
                        },
                        {
                            "id": "c10_maths_ch07", "chapter_number": 7, "title": "Some Applications of Trigonometry",
                            "learning_objectives": ["Angle of elevation and angle of depression", "Heights and distances word problems"],
                            "prerequisites": ["c10_maths_ch06"], "keywords": ["angle of elevation", "depression", "heights and distances"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "science": {
            "board": "CBSE", "grade": "Class 10", "subject": "Science",
            "units": [
                {
                    "id": "c10_sci_u1", "title": "Chemical Substances: Nature and Behaviour", "sub_discipline": "Chemistry",
                    "chapters": [
                        {
                            "id": "c10_chem_ch01", "chapter_number": 1, "title": "Chemical Reactions and Equations",
                            "learning_objectives": ["Balancing chemical equations by hit-and-trial", "Combination, decomposition, displacement, double displacement, redox"],
                            "prerequisites": [], "keywords": ["chemical reaction", "balancing", "redox", "oxidation", "corrosion"], "needs_review": True
                        },
                        {
                            "id": "c10_chem_ch02", "chapter_number": 2, "title": "Acids, Bases and Salts",
                            "learning_objectives": ["pH scale and importance in everyday life", "Manufacturing and properties of Bleaching Powder, Baking Soda, Plaster of Paris"],
                            "prerequisites": ["c10_chem_ch01"], "keywords": ["pH scale", "neutralization", "baking soda", "plaster of paris"], "needs_review": True
                        },
                        {
                            "id": "c10_chem_ch03", "chapter_number": 3, "title": "Metals and Non-metals",
                            "learning_objectives": ["Reactivity series and ionic compound formation/properties", "Corrosion and its prevention"],
                            "prerequisites": ["c10_chem_ch01"], "keywords": ["reactivity series", "ionic bond", "calcination", "roasting"], "needs_review": True
                        },
                        {
                            "id": "c10_chem_ch04", "chapter_number": 4, "title": "Carbon and its Compounds",
                            "learning_objectives": ["Covalent bonding, catenation, and tetravalency of carbon", "Homologous series, functional groups, ethanol and ethanoic acid properties"],
                            "prerequisites": ["c10_chem_ch01"], "keywords": ["covalent bond", "homologous series", "ethanol", "saponification"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c10_sci_u2", "title": "World of Living: Biology", "sub_discipline": "Biology",
                    "chapters": [
                        {
                            "id": "c10_bio_ch01", "chapter_number": 5, "title": "Life Processes",
                            "learning_objectives": ["Human nutrition, respiration (aerobic vs anaerobic)", "Transportation in humans and plants, excretion in kidneys/nephrons"],
                            "prerequisites": [], "keywords": ["respiration", "circulation", "nephron", "dialysis", "xylem"], "needs_review": True
                        },
                        {
                            "id": "c10_bio_ch02", "chapter_number": 6, "title": "Control and Coordination",
                            "learning_objectives": ["Human nervous system and reflex arcs", "Plant hormones (Auxin, Gibberellin) and endocrine glands in humans"],
                            "prerequisites": ["c10_bio_ch01"], "keywords": ["neuron", "reflex arc", "brain", "auxin", "insulin"], "needs_review": True
                        },
                        {
                            "id": "c10_bio_ch03", "chapter_number": 7, "title": "How do Organisms Reproduce?",
                            "learning_objectives": ["Asexual reproduction modes (binary fission, budding, spore formation)", "Sexual reproduction in flowering plants and human reproductive system"],
                            "prerequisites": ["c10_bio_ch01"], "keywords": ["pollination", "fertilization", "gametes", "contraception"], "needs_review": True
                        },
                        {
                            "id": "c10_bio_ch04", "chapter_number": 8, "title": "Heredity and Evolution",
                            "learning_objectives": ["Mendel's monohybrid and dihybrid crosses", "Sex determination in human beings"],
                            "prerequisites": ["c10_bio_ch03"], "keywords": ["mendel", "genotype", "phenotype", "sex determination", "dominant"], "needs_review": True
                        }
                    ]
                },
                {
                    "id": "c10_sci_u3", "title": "Natural Phenomena & Effects of Current: Physics", "sub_discipline": "Physics",
                    "chapters": [
                        {
                            "id": "c10_phys_ch01", "chapter_number": 9, "title": "Light: Reflection and Refraction",
                            "learning_objectives": ["Mirror formula, magnification, and ray diagrams for spherical mirrors", "Snell's law, refractive index, and lens formula"],
                            "prerequisites": [], "keywords": ["reflection", "refraction", "mirror formula", "lens formula", "power of lens"], "needs_review": True
                        },
                        {
                            "id": "c10_phys_ch02", "chapter_number": 10, "title": "The Human Eye and the Colorful World",
                            "learning_objectives": ["Structure of the eye and defects of vision (Myopia, Hypermetropia)", "Atmospheric refraction, dispersion through a prism, Tyndall effect"],
                            "prerequisites": ["c10_phys_ch01"], "keywords": ["myopia", "hypermetropia", "dispersion", "rainbow", "scattering"], "needs_review": True
                        },
                        {
                            "id": "c10_phys_ch03", "chapter_number": 11, "title": "Electricity",
                            "learning_objectives": ["Ohm's law (V=IR), factors affecting resistance (resistivity)", "Series and parallel resistor combinations, Joule's law of heating, electric power"],
                            "prerequisites": [], "keywords": ["current", "voltage", "ohm's law", "resistance", "joule's heating", "power"], "needs_review": True
                        },
                        {
                            "id": "c10_phys_ch04", "chapter_number": 12, "title": "Magnetic Effects of Electric Current",
                            "learning_objectives": ["Magnetic field patterns around straight wire, circular loop, and solenoid", "Fleming's Left-Hand Rule, electric motor, electromagnetic induction"],
                            "prerequisites": ["c10_phys_ch03"], "keywords": ["magnetic field", "solenoid", "fleming's left hand rule", "electric motor"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "english": {
            "board": "CBSE", "grade": "Class 10", "subject": "English",
            "units": [
                {
                    "id": "c10_eng_u1", "title": "Advanced Grammar & Formal Writing",
                    "chapters": [
                        {
                            "id": "c10_eng_ch01", "chapter_number": 1, "title": "Error Correction & Editing",
                            "learning_objectives": ["Spot grammatical errors in verb forms, prepositions, articles", "Editing and omission techniques for board exams"],
                            "prerequisites": [], "keywords": ["editing", "omission", "error detection"], "needs_review": True
                        }
                    ]
                }
            ]
        },
        "social_science": {
            "board": "CBSE", "grade": "Class 10", "subject": "Social Science",
            "units": [
                {
                    "id": "c10_soc_u1", "title": "History, Political Science & Economics",
                    "chapters": [
                        {
                            "id": "c10_soc_ch01", "chapter_number": 1, "title": "The Rise of Nationalism in Europe",
                            "learning_objectives": ["French Revolution and idea of the nation", "Unification of Germany and Italy"],
                            "prerequisites": [], "keywords": ["nationalism", "liberalism", "garibaldi", "bismarck"], "needs_review": True
                        },
                        {
                            "id": "c10_soc_ch02", "chapter_number": 2, "title": "Power Sharing (Political Science)",
                            "learning_objectives": ["Case studies of Belgium and Sri Lanka", "Forms of power sharing in modern democracies"],
                            "prerequisites": [], "keywords": ["power sharing", "belgium", "sri lanka", "majoritarianism"], "needs_review": True
                        },
                        {
                            "id": "c10_soc_ch03", "chapter_number": 3, "title": "Development (Economics)",
                            "learning_objectives": ["Income and other goals, national development", "Human Development Index (HDI) vs per capita income"],
                            "prerequisites": [], "keywords": ["development", "per capita income", "HDI", "sustainability"], "needs_review": True
                        }
                    ]
                }
            ]
        }
    }
}


def generate_all():
    count = 0
    for grade_dir, subjects_map in CURRICULUM_DATA.items():
        for subj_name, data in subjects_map.items():
            target_path = BASE_DIR / grade_dir / f"{subj_name}.json"
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            count += 1
    print(f"Generated {count} CBSE curriculum JSON files across Classes 3-10.")


if __name__ == "__main__":
    generate_all()

