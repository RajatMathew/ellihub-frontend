#!/usr/bin/env bash

set -Eeuo pipefail

CONFIG_FILE=".subtree-config"

# Default values
CORE_BRANCH="feat/quickbooks"
UI_BRANCH="feat/quickbooks"
ENGINE_BRANCH="advanced"

########################################
# Config
########################################

load_config() {
    if [[ -f "$CONFIG_FILE" ]]; then
        source "$CONFIG_FILE"
    fi
}

save_config() {
cat > "$CONFIG_FILE" <<EOF
CORE_BRANCH="$CORE_BRANCH"
UI_BRANCH="$UI_BRANCH"
ENGINE_BRANCH="$ENGINE_BRANCH"
EOF
}

########################################
# UI
########################################

pause() {
    echo
    read -rp "Press Enter to continue..."
}

header() {
    clear

    echo
    echo "======================================="
    echo "       ELLI SUBTREE MANAGER"
    echo "======================================="
    echo
    echo " Core   : $CORE_BRANCH"
    echo " UI     : $UI_BRANCH"
    echo " Engine : $ENGINE_BRANCH"
    echo
}

########################################
# Branch Helpers
########################################

choose_branch() {

    local remote="$1"

    echo
    echo "Fetching branches from $remote..."
    git fetch "$remote" >/dev/null 2>&1 || true

    mapfile -t branches < <(
        git branch -r |
        grep "${remote}/" |
        sed "s#.*${remote}/##" |
        sort -u
    )

    if [[ ${#branches[@]} -eq 0 ]]; then
        echo
        echo "No branches found for $remote"
        pause
        return 1
    fi

    echo
    echo "Available branches:"
    echo

    local i=1

    for branch in "${branches[@]}"; do
        printf "%2d) %s\n" "$i" "$branch"
        ((i++))
    done

    echo

    while true; do

        read -rp "Choose branch number: " selection

        if [[ "$selection" =~ ^[0-9]+$ ]] &&
           (( selection >= 1 && selection <= ${#branches[@]} ))
        then
            echo "${branches[$((selection-1))]}"
            return 0
        fi

        echo "Invalid selection"
    done
}

########################################
# Branch Changes
########################################

change_core_branch() {

    local branch

    branch=$(choose_branch "elli-core") || return

    CORE_BRANCH="$branch"

    save_config

    echo
    echo "Core branch changed to:"
    echo "$CORE_BRANCH"

    pause
}

change_ui_branch() {

    local branch

    branch=$(choose_branch "elli-ui") || return

    UI_BRANCH="$branch"

    save_config

    echo
    echo "UI branch changed to:"
    echo "$UI_BRANCH"

    pause
}

change_engine_branch() {

    local branch

    branch=$(choose_branch "elli-engine") || return

    ENGINE_BRANCH="$branch"

    save_config

    echo
    echo "Engine branch changed to:"
    echo "$ENGINE_BRANCH"

    pause
}

########################################
# Git Operations
########################################

refresh_remotes() {

    echo
    echo "Fetching remotes..."

    git fetch elli-core
    git fetch elli-ui
    git fetch elli-engine

    echo
    echo "Done."

    pause
}

sync_all() {

    echo
    echo "Syncing Core..."

    git fetch elli-core "$CORE_BRANCH"

    git subtree pull \
        --prefix=elli-core \
        elli-core \
        "$CORE_BRANCH" \
        --squash

    echo
    echo "Syncing UI..."

    git fetch elli-ui "$UI_BRANCH"

    git subtree pull \
        --prefix=elli-ui \
        elli-ui \
        "$UI_BRANCH" \
        --squash

    echo
    echo "Syncing Engine..."

    git fetch elli-engine "$ENGINE_BRANCH"

    git subtree pull \
        --prefix=elli-engine \
        elli-engine \
        "$ENGINE_BRANCH" \
        --squash

    echo
    echo "All subtrees updated."

    pause
}

push_all() {

    echo
    echo "Push Core..."

    git subtree push \
        --prefix=elli-core \
        elli-core \
        "$CORE_BRANCH"

    echo
    echo "Push UI..."

    git subtree push \
        --prefix=elli-ui \
        elli-ui \
        "$UI_BRANCH"

    echo
    echo "Push Engine..."

    git subtree push \
        --prefix=elli-engine \
        elli-engine \
        "$ENGINE_BRANCH"

    echo
    echo "Push completed."

    pause
}

########################################
# Main Menu
########################################

main_menu() {

    while true; do

        header

        echo "1) Change Core Branch"
        echo "2) Change UI Branch"
        echo "3) Change Engine Branch"
        echo
        echo "4) Refresh Remotes"
        echo "5) Sync All Subtrees"
        echo "6) Push All Subtrees"
        echo
        echo "7) Exit"
        echo

        read -rp "Select option: " option

        case "$option" in

            1)
                change_core_branch
                ;;

            2)
                change_ui_branch
                ;;

            3)
                change_engine_branch
                ;;

            4)
                refresh_remotes
                ;;

            5)
                sync_all
                ;;

            6)
                push_all
                ;;

            7)
                exit 0
                ;;

            *)
                echo
                echo "Invalid option"
                pause
                ;;
        esac
    done
}

########################################
# Start
########################################

load_config
main_menu