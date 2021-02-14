#ifndef ENBB2ENUMS_H
#define ENBB2ENUMS_H
#include <QString>
#include <QDebug>

namespace BB2XMLParser
{

    enum enWeather
    {
        weNice = 0,
        weSwelteringHeat = 1,
        weVerySunny = 2,
        wePouringRain = 3,
        weBlizzard = 4,
    };

    inline QString getWeatherString(int type)
    {
        enWeather at = static_cast<enWeather>(type);
        QString atResult = QString("Unknown (%1)").arg(type);

        switch (at)
        {
        case BB2XMLParser::weNice:
            atResult = "Nice";
            break;
        case BB2XMLParser::weSwelteringHeat:
            atResult = "Sweltering Heat";
            break;
        case BB2XMLParser::weVerySunny:
            atResult = "Very Sunny";
            break;
        case BB2XMLParser::wePouringRain:
            atResult = "Pouring Rain";
            break;
        case BB2XMLParser::weBlizzard:
            atResult = "Blizzard";
            break;
        }
        return atResult;
    }

    namespace enRulesEventBoardAction
    {

        enum RequestType
        {
            rtUnknown_0 = 0,
            rtForCoach = 1, //Coach / Player

        };

        enum ActionType
        {
            atMove = 0,            //Move
            atBlock = 1,           //Block
            atBlitz = 2,           //Blitz
            atPass = 3,            //Pass
            atHandoff = 4,         //Ball handoff
            atFoulAR = 5,          //Armor
            atArmor = 6,           //Armor
            atKickoff = 7,         //Pick Kickoff Location
            atScatter = 8,         //Pick Kickoff Scatter KickSkill
            atCatch = 9,           //Catch
            atTouchDown = 10,      //Touchdown?
            atStunWake = 11,       //End Turn Stun release?
            atWakeUp = 12,         //Wake up after KO
            atPickup = 14,         //Pickup Ball
            atActivationTest = 15, //Activation Test
            atLanding = 16,
            atShadowing = 18,
            atStab = 19,
            atLeap = 21,
            atBallChain = 23,
            atMultiBlock = 26,
            atHypnoticGaze = 27,
            atWizardFireBallCast = 31,
            atWizardFireball = 32,
            atWizardLightning = 33, //Wizard Lightning
            atFoulRefCheck = 34,    //Foul - Comes After Armor roll - maybe ref?
            atFreeMove = 37,        //Move after High Kick
            atDodgeAgDivingTackle = 39,
            atMultiStab = 41,
            atActivatePlayer = 42, //Select Active Player
            atUnknown_46 = 46,     //After Kickoff Choice, has 2 BoardActionResults with RT 69
            atUnknown_47 = 47,     //After Kickoff Choice, has 1 BoardActionResult with RT 70
            atSwelteringHeat = 48,
            atBombKnockDown = 50,
            atBombHalfDown = 51,
            atBombThrow = 52,
            atBombCatch = 53,
            atBombScatter = 54,          // (Bomb) Scatter after HailMary pass ?
            atBombThrowDestination = 55, // Pick the throw destination after a Bomb Catch(Intercept?)
        };

        inline QString getActionTypeString(int type)
        {
            enRulesEventBoardAction::ActionType at = static_cast<enRulesEventBoardAction::ActionType>(type);
            QString atResult = QString("Unknown (%1)").arg(type);

            switch (at)
            {
            case BB2XMLParser::enRulesEventBoardAction::atMultiBlock:
                atResult = "Multiple Block";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atMultiStab:
                atResult = "Multi Stab";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atHypnoticGaze:
                atResult = "Hypnotic Gaze";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombCatch:
                atResult = "Catch Bomb";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombScatter:
                atResult = "Bomb Scatter";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombThrowDestination:
                atResult = "Throw Bomb";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atSwelteringHeat:
                atResult = "Sweltering Heat!";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atWizardFireBallCast:
                atResult = "Fireball!";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atDodgeAgDivingTackle:
                atResult = "Diving Tackle!";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombKnockDown:
                atResult = "Bomb Knockdown";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombHalfDown:
                atResult = "Bomb Explosion";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBombThrow:
                atResult = "Throw Bomb";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atShadowing:
                atResult = "Shadowing";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBallChain:
                atResult = "Ball & Chain";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atLanding:
                atResult = "Landing";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atMove:
                atResult = "Move";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBlock:
                atResult = "Block";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atBlitz:
                atResult = "Blitz";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atPass:
                atResult = "Pass";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atHandoff:
                atResult = "Handoff";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atFoulAR:
                atResult = "Foul";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atArmor:
                atResult = "Armor";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atKickoff:
                atResult = "Kickoff";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atScatter:
                atResult = "Scatter";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atCatch:
                atResult = "Catch";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atTouchDown:
                atResult = "Touchdown!";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atStunWake:
                atResult = "Recover from Stun";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atWakeUp:
                atResult = "Wake up after KO";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atPickup:
                atResult = "Pickup";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atActivationTest:
                atResult = "Activation";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atStab:
                atResult = "Stab";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atLeap:
                atResult = "Leap";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atWizardLightning:
                atResult = "Lightning Bolt";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atWizardFireball:
                atResult = "Fireball";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atFoulRefCheck:
                atResult = "Referee";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atFreeMove:
                atResult = "Move";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atActivatePlayer:
                atResult = "Activate Player";
                break;
            case BB2XMLParser::enRulesEventBoardAction::atUnknown_46:
                break;
            case BB2XMLParser::enRulesEventBoardAction::atUnknown_47:
                break;
            default:
                qDebug() << Q_FUNC_INFO << "Action " << atResult;
            }
            return atResult;
        }

        namespace enBoardActionResult
        {
            enum RequestType
            {
                rtNoRequest = 0,
                rtReroll = 1,   //Failed Roll -> Reroll
                rtPickDice = 2, //Block Dice No RR Option -> Same for PickApo Result
                rtLocation = 3,
                rtBlockOrRR = 5,   //Block Dice with RR Option
                rtUnknown_69 = 69, // s.o. at_46
                rtUnknown_70 = 70, // s.o. at_47
            };

            enum ResultType
            {
                rsPassed = 0,         //Skilltest Passed
                rsFailNoTurnover = 1, //Failed with Skill Reroll -> Failed no Turnover (Wild Animal Fail ect)
                rsFailTeamRR = 2,     //Failed with Possible Reroll
                rsFailFinal = 3,      //Failed No Reroll -> Final!
            };

            enum RollType
            {
                rlNoRoll = 0,
                rlGFI = 1,
                rlDodge = 2,
                rlArmor = 3,     //2d6 Armor Roll
                rlInjury = 4,    //2d6 Injury Roll
                rlBlockDice = 5, //2d6 Block dice
                rlStandUp = 6,   //Treeman Stand Up Test
                rlPickup = 7,
                rlCasualty = 8, //d6 d8 Cas Roll
                rlCatch = 9,    //1d6 Catch
                rlScatter = 10, //Scatter Dice D8,D6
                rlThrowIn = 11,
                rlPass = 12,
                rlPushLocation = 13, //Pick Defender Location after Block
                rlBlockFollow = 14,  //Pick Attacker Location after Block
                rlFoulRefCheck = 15,
                rlIntercept = 16, //Intercept Choice -> List cells contain positions for available Players
                rlWakeUpAfterKO = 17,
                rlTouchback = 19,
                rlBoneHead = 20, //Bone Head Animal Check
                rlReallyStupid = 21,
                rlWildAnimal = 22, //Wild Animal Check
                rlLoner = 23,      //Loner RR Check
                rlLanding = 24,
                rlRegeneration = 25,
                rlInaccuratePass = 26,
                rlAlwaysHungry = 27,
                rlEatTeammate = 28, // Not sure
                rlDauntless = 29,
                rlSafeThrow = 30,
                rlJumpUp = 31, //Jump Up Check
                rlShadowing = 32,
                rlStab = 34,
                rlLeap = 36,
                rlFoulAppearance = 37,
                rlTentacles = 38,
                rlChainsaw = 39,
                rlTakeRoot = 40,
                rlBallChain = 41,
                rlHailMaryPass = 42,
                rlDivingTackle = 44,
                rlPro = 45,
                rlHypnoticGaze = 46,
                rlAnimosity = 49,
                rlBloodlust = 50,
                rlBite = 51,
                rlBribe = 52,
                rlWizardFireball = 54,
                rlWizardLightning = 55, //1d6 Wizard Lightning
                rlThrowTeammate = 56,
                rlMultipleBlock = 57,
                rlExtraScatter = 58,
                rlPileOnArmor = 59,
                rlPileOnInjury = 60,
                rlWrestle = 61,
                rlDodgePick = 62, //Maybe autopick after timeout?
                rlStandFirm = 63,
                rlJuggernaut = 64, //Juggernaut Choice?
                rlStandFirm2 = 65, //Stand firm on player the target gets pushed into?
                rlRaiseDead = 66,
                rlSwelteringHeat = 71,
                rlBombKnockdown = 72, //Bombadier Bomb outer Radius 4+ down Test
                rlChainsawArmor = 73,
                rlFoulArmor = 103,  //2d6 Armor Roll internal for Foul Statistics
                rlFoulInjury = 104, //2d6 Injury Roll internal for Foul Statistics
            };

            inline QString getRollTypeString(int type)
            {
                RollType rt = static_cast<RollType>(type);
                QString rtResult = QString("Unknown (%1)").arg(type);

                switch (rt)
                {
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlFoulArmor:
                    rtResult = "Foul Armor";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlFoulInjury:
                    rtResult = "Foul Injury";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlRaiseDead:
                    rtResult = "Raise Dead!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlMultipleBlock:
                    rtResult = "Multiple Block";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlHailMaryPass:
                    rtResult = "Hail Mary Pass";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlDivingTackle:
                    rtResult = "Diving Tackle!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlEatTeammate:
                    rtResult = "Eat Teammate";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlRegeneration:
                    rtResult = "Regeneration";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlSafeThrow:
                    rtResult = "Safe Trow";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlPileOnArmor:
                    rtResult = "Piling On";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlPileOnInjury:
                    rtResult = "Piling On";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlChainsawArmor:
                    rtResult = "Chainsaw";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlStandUp:
                    rtResult = "Stand Up";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlTakeRoot:
                    rtResult = "Take Root";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlSwelteringHeat:
                    rtResult = "Sweltering Heat!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlDauntless:
                    rtResult = "Dauntless!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlFoulAppearance:
                    rtResult = "Foul Appearance!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlBombKnockdown:
                    rtResult = "Bomb!";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlShadowing:
                    rtResult = "Escape Shadowing";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlBallChain:
                    rtResult = "Ball & Chain";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlJuggernaut:
                    rtResult = "Juggernaut";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlPro:
                    rtResult = "Pro";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlDodgePick:
                    rtResult = "Use Dodge?";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlChainsaw:
                    rtResult = "Chainsaw";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlStandFirm:
                    rtResult = "Stand Firm";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlStandFirm2:
                    rtResult = "Stand Firm";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlHypnoticGaze:
                    rtResult = "Hypnotic Gaze";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlBloodlust:
                    rtResult = "Bloodlust";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlBite:
                    rtResult = "Bites";
                    break;
                case BB2XMLParser::enRulesEventBoardAction::enBoardActionResult::rlWrestle:
                    rtResult = "Wrestle";
                    break;
                case rlStab:
                    rtResult = "Stab";
                    break;
                case rlThrowIn:
                    rtResult = "Throw In";
                    break;
                case rlExtraScatter:
                    rtResult = "Scatter";
                    break;
                case rlPickup:
                    rtResult = "Pickup";
                    break;
                case rlTouchback:
                    rtResult = "Touchback";
                    break;
                case rlLanding:
                    rtResult = "Landing";
                    break;
                case rlInaccuratePass:
                    rtResult = "Inaccurate Pass";
                    break;
                case rlAlwaysHungry:
                    rtResult = "Always Hungry";
                    break;
                case rlAnimosity:
                    rtResult = "Animosity";
                    break;
                case rlBribe:
                    rtResult = "Bribe";
                    break;
                case rlThrowTeammate:
                    rtResult = "Throw Teammate";
                    break;
                case rlNoRoll:
                    rtResult = "Unknown (0)";
                    break;
                case rlGFI:
                    rtResult = "GFI";
                    break;
                case rlDodge:
                    rtResult = "Dodge";
                    break;
                case rlArmor:
                    rtResult = "Armor";
                    break;
                case rlInjury:
                    rtResult = "Injury";
                    break;
                case rlBlockDice:
                    rtResult = "Block";
                    break;
                case rlCasualty:
                    rtResult = "Casualty";
                    break;
                case rlCatch:
                    rtResult = "Catch";
                    break;
                case rlScatter:
                    rtResult = "Scatter";
                    break;
                case rlPass:
                    rtResult = "Pass";
                    break;
                case rlPushLocation:
                    rtResult = "Push";
                    break;
                case rlBlockFollow:
                    rtResult = "Follow";
                    break;
                case rlFoulRefCheck:
                    rtResult = "Referee";
                    break;
                case rlIntercept:
                    rtResult = "Intercept";
                    break;
                case rlWakeUpAfterKO:
                    rtResult = "Wake Up";
                    break;
                case rlWildAnimal:
                    rtResult = "Wild Animal";
                    break;
                case rlBoneHead:
                    rtResult = "Bone Head";
                    break;
                case rlReallyStupid:
                    rtResult = "Really Stupid";
                    break;
                case rlLoner:
                    rtResult = "Loner";
                    break;
                case rlJumpUp:
                    rtResult = "Jump Up";
                    break;
                case rlLeap:
                    rtResult = "Leap";
                    break;
                case rlTentacles:
                    rtResult = "Tentacles";
                    break;
                case rlWizardFireball:
                    rtResult = "Fireball";
                    break;
                case rlWizardLightning:
                    rtResult = "Lightning Bolt";
                    break;
                default:
                    qDebug() << Q_FUNC_INFO << "RollType " << rtResult;
                }
                return rtResult;
            }

            enum RollStatus
            {
                rstNoStatus = 0,
                rstRerollTaken = 1,
                rstRerollNotTaken = 2,
                rstRerollWithSkill = 3,
                rstReroll4 = 4, //After Subresult 7 (Failed Dodge) - Maybe after use skill(dodge) question
            };

            enum SubResultType
            {
                srtArmorNoBreak = 1, //Not sure - after rlArmor (3) - Only after Block?
                srtInjuryStun = 2,
                srtInjuryKO = 3,
                srtInjuryCAS = 4,
                srtUnknown_7 = 7,   //Pick Dodge skill use?
                srtCASResult = 18,  //Final CAS Result
                srtFend = 35,       //Blockdice against Fend, no 2nd Dice.
                srtDodgeNoReq = 57, //Dodge vs Tackle before RR Pick
                srtUnknown_68 = 68, //Pick Wrestle skill use?
            };

        } // namespace enBoardActionResult

    } // namespace enRulesEventBoardAction

    namespace enRulesEventWaitingRequests
    {
        enum RequestType
        {
            rtUnknown_0 = 0,
            rtUnknown_2 = 2,   //KickOff
            rtUnknown_3 = 3,   //Pick Player - After High Kick
            rtUnknown_4 = 4,   //Use skill (dodge?)
            rtUnknown_7 = 7,   //After Inducements before KickoffChoice
            rtUnknown_8 = 8,   //After KickoffChoice for coach that defends?
            rtUnknown_13 = 13, //End/Pick Inducements? Pick Coin Toss?

        };
    } // namespace enRulesEventWaitingRequests

    inline QString StringToDisplayString(QString str, bool toCamelCase = false)
    {
        QString res;

        for (int i = 0; i < str.length(); i++)
        {
            if (str.at(i) == "_")
            {
                res += " ";
            }
            else
            {
                if (str.at(i).isUpper() && !toCamelCase)
                {
                    if (i != 0 && res.right(1) != " " && !res.right(1).isUpper())
                    {
                        res += " ";
                    }
                }
                if (i != 0 && res.right(1) != " " && toCamelCase)
                {
                    res += str.at(i).toLower();
                }
                else
                {
                    res += str.at(i);
                }
            }
        }
        return res;
    }

    enum BlockOutcome
    {
        boAtDownDeInPlace = 0,
        boAtDownDeDown = 1,
        boWrestleDown = 2, //Before use wrestle choice!
        boAtInPlaceDeInPlace = 3,
        boAtMoveDePush = 4,
        boAtInPlaceDeDown = 5, //block down De in Place -> Fend has no 2nd dice afterpush?
        boAtMoveDePushDown = 6,
        boMaxValue,
        boError,
    };

    inline QString BlockOutcomeToString(BlockOutcome value)
    {
        if (value == boAtDownDeInPlace)
        {
            return "AtDownDeInPlace";
        }
        if (value == boAtDownDeDown)
        {
            return "AtDownDeDown";
        }
        if (value == boWrestleDown)
        {
            return "WrestleDown";
        }
        if (value == boAtInPlaceDeInPlace)
        {
            return "AtInPlaceDeInPlace";
        }
        if (value == boAtMoveDePush)
        {
            return "AtMoveDePush";
        }
        if (value == boAtInPlaceDeDown)
        {
            return "AtInPlaceDeDown";
        }
        if (value == boAtMoveDePushDown)
        {
            return "AtMoveDePushDown";
        }
        return "";
    }

    inline BlockOutcome stringToBlockOutcome(QString value)
    {
        if (value == "AtDownDeInPlace")
        {
            return boAtDownDeInPlace;
        }
        if (value == "AtDownDeDown")
        {
            return boAtDownDeDown;
        }
        if (value == "WrestleDown")
        {
            return boWrestleDown;
        }
        if (value == "AtInPlaceDeInPlace")
        {
            return boAtInPlaceDeInPlace;
        }
        if (value == "AtMoveDePush")
        {
            return boAtMoveDePush;
        }
        if (value == "AtInPlaceDeDown")
        {
            return boAtInPlaceDeDown;
        }
        if (value == "AtMoveDePushDown")
        {
            return boAtMoveDePushDown;
        }
        return boError;
    }

    enum KickOffTable
    {
        kotGet_The_Ref = 0,
        kotRiot = 1,
        kotPerfect_Defense = 2,
        kotHigh_Kick = 3,
        kotCheering_Fans = 4,
        kotChanging_Weather = 5,
        kotBrilliant_Coaching = 6,
        kotQuick_Snap = 7,
        kotBlitz = 8,
        kotThrow_a_Rock = 9,
        kotPitch_Invasion = 10,
        kotMaxValue,
        kotError,
    };

    inline QString KickOffTableToString(KickOffTable value)
    {
        if (value == kotGet_The_Ref)
        {
            return "Get_The_Ref";
        }
        if (value == kotRiot)
        {
            return "Riot";
        }
        if (value == kotPerfect_Defense)
        {
            return "Perfect_Defense";
        }
        if (value == kotHigh_Kick)
        {
            return "High_Kick";
        }
        if (value == kotCheering_Fans)
        {
            return "Cheering_Fans";
        }
        if (value == kotChanging_Weather)
        {
            return "Changing_Weather";
        }
        if (value == kotBrilliant_Coaching)
        {
            return "Brilliant_Coaching";
        }
        if (value == kotQuick_Snap)
        {
            return "Quick_Snap";
        }
        if (value == kotBlitz)
        {
            return "Blitz";
        }
        if (value == kotThrow_a_Rock)
        {
            return "Throw_a_Rock";
        }
        if (value == kotPitch_Invasion)
        {
            return "Pitch_Invasion";
        }
        return QString("Error %1").arg(value);
    }

    inline KickOffTable stringToKickOffTable(QString value)
    {
        if (value == "Get_The_Ref")
        {
            return kotGet_The_Ref;
        }
        if (value == "Riot")
        {
            return kotRiot;
        }
        if (value == "Perfect_Defense")
        {
            return kotPerfect_Defense;
        }
        if (value == "High_Kick")
        {
            return kotHigh_Kick;
        }
        if (value == "Cheering_Fans")
        {
            return kotCheering_Fans;
        }
        if (value == "Changing_Weather")
        {
            return kotChanging_Weather;
        }
        if (value == "Brilliant_Coaching")
        {
            return kotBrilliant_Coaching;
        }
        if (value == "Quick_Snap")
        {
            return kotQuick_Snap;
        }
        if (value == "Blitz")
        {
            return kotBlitz;
        }
        if (value == "Throw_a_Rock")
        {
            return kotThrow_a_Rock;
        }
        if (value == "Pitch_Invasion")
        {
            return kotPitch_Invasion;
        }
        return kotError;
    }

} //End Namespace BB2XMLParser

#endif // ENBB2ENUMS_H
