#!/usr/bin/env bash

set -Eeuo pipefail

CONFIG_FILE=".subtree-config"

########################################
# Config
########################################

load_config() {

    if [[ ! -f "$CONFIG_FILE" ]]; then

cat > "$CONFIG_FILE" <<'EOF'
# Defaults

CORE_BRANCH="feat/quickbooks"
UI_BRANCH="feat/quickbooks"
ENGINE_BRANCH="advanced"
EOF

    fi

    source "$CONFIG_FILE"

    CORE_BRANCH="${CORE_BRANCH:-feat/quickbooks}"
    UI_BRANCH="${UI_BRANCH:-feat/quickbooks}"
    ENGINE_BRANCH="${ENGINE_BRANCH:-advanced}"
}

save_config() {

cat > "$CONFIG_FILE" <<EOF
# Defaults

CORE_BRANCH="$CORE_BRANCH"
UI_BRANCH="$UI_BRANCH"
ENGINE_BRANCH="$ENGINE_BRANCH"
EOF

}

########################################
# Helpers
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
    echo "Core   : $CORE_BRANCH"
    echo "UI     : $UI_BRANCH"
    echo "Engine : $ENGINE_BRANCH"
    echo
}

########################################
# Branch Selector
########################################

choose_branch() {

    local remote="$1"

    git fetch "$remote" >/dev/null 2>&1 || true

    mapfile -t branches < <(
        git branch -r |
        grep "${remote}/" |
        sed "s#.*${remote}/##" |
        grep -v HEAD |
        sort -u
    )

    if [[ ${#branches[@]} -eq 0 ]]; then
        echo "No branches found for $remote"
        pause
        return 1
    fi

    while true; do

        clear

        echo
        echo "======================================="
        echo " Branch Selector ($remote)"
        echo "======================================="
        echo

        case "$remote" in
            elli-core)
                echo "Current : $CORE_BRANCH"
                ;;
            elli-ui)
                echo "Current : $UI_BRANCH"
                ;;
            elli-engine)
                echo "Current : $ENGINE_BRANCH"
                ;;
        esac

        echo

        read -rp "Search branch (blank=all, q=cancel): " search

        [[ "$search" == "q" ]] && return 1

        filtered=()

        if [[ -z "$search" ]]; then

            filtered=("${branches[@]}")

        else

            for branch in "${branches[@]}"; do

                if [[ "${branch,,}" == *"${search,,}"* ]]; then
                    filtered+=("$branch")
                fi

            done
        fi

        if [[ ${#filtered[@]} -eq 0 ]]; then
            echo
            echo "No matching branches."
            pause
            continue
        fi

        echo
        echo "Matching branches"
        echo "-----------------"

        for i in "${!filtered[@]}"; do
            printf "%3d) %s\n" $((i+1)) "${filtered[$i]}"
        done

        echo

        read -rp "Select branch number (0=search again): " choice

        if [[ "$choice" == "0" ]]; then
            continue
        fi

        if [[ "$choice" =~ ^[0-9]+$ ]] &&
           (( choice >= 1 && choice <= ${#filtered[@]} ))
        then
            printf "%s" "${filtered[$((choice-1))]}"
            return 0
        fi

        echo
        echo "Invalid selection."
        pause
    done
}

########################################
# Branch Management
########################################

change_core_branch() {

    local branch

    branch=$(choose_branch "elli-core") || return

    CORE_BRANCH="$branch"

    save_config

    echo
    echo "Core branch updated:"
    echo "$CORE_BRANCH"

    pause
}

change_ui_branch() {

    local branch

    branch=$(choose_branch "elli-ui") || return

    UI_BRANCH="$branch"

    save_config

    echo
    echo "UI branch updated:"
    echo "$UI_BRANCH"

    pause
}

change_engine_branch() {

    local branch

    branch=$(choose_branch "elli-engine") || return

    ENGINE_BRANCH="$branch"

    save_config

    echo
    echo "Engine branch updated:"
    echo "$ENGINE_BRANCH"

    pause
}

########################################
# Git Operations
########################################

refresh_remotes() {

    echo
    echo "Refreshing remotes..."

    git fetch elli-core
    git fetch elli-ui
    git fetch elli-engine

    echo
    echo "Completed."

    pause
}

sync_all() {

    echo
    echo "Fetching remotes..."

    git fetch elli-core "$CORE_BRANCH"
    git fetch elli-ui "$UI_BRANCH"
    git fetch elli-engine "$ENGINE_BRANCH"

    echo
    echo "Pulling elli-core..."
    git subtree pull \
        --prefix=elli-core \
        elli-core \
        "$CORE_BRANCH" \
        --squash

    echo
    echo "Pulling elli-ui..."
    git subtree pull \
        --prefix=elli-ui \
        elli-ui \
        "$UI_BRANCH" \
        --squash

    echo
    echo "Pulling elli-engine..."
    git subtree pull \
        --prefix=elli-engine \
        elli-engine \
        "$ENGINE_BRANCH" \
        --squash

    echo
    echo "All subtree updates completed."

    pause
}

push_all() {

    echo
    echo "Pushing elli-core..."
    git subtree push \
        --prefix=elli-core \
        elli-core \
        "$CORE_BRANCH"

    echo
    echo "Pushing elli-ui..."
    git subtree push \
        --prefix=elli-ui \
        elli-ui \
        "$UI_BRANCH"

    echo
    echo "Pushing elli-engine..."
    git subtree push \
        --prefix=elli-engine \
        elli-engine \
        "$ENGINE_BRANCH"

    echo
    echo "All subtree pushes completed."

    pause
}

force_sync_all() {

    echo
    echo "======================================="
    echo "FORCE SQUASH SYNC ALL"
    echo "======================================="
    echo

    read -rp "Type YES to continue: " confirm
    [[ "$confirm" != "YES" ]] && return

    git fetch elli-core "$CORE_BRANCH" || return 1
    git fetch elli-ui "$UI_BRANCH" || return 1
    git fetch elli-engine "$ENGINE_BRANCH" || return 1

    # Remove subtrees
    git rm -r elli-core elli-ui elli-engine
    git commit -m "Remove subtrees"

    # Re-add as squash
    git subtree add --prefix=elli-core elli-core "$CORE_BRANCH" --squash
    git subtree add --prefix=elli-ui elli-ui "$UI_BRANCH" --squash
    git subtree add --prefix=elli-engine elli-engine "$ENGINE_BRANCH" --squash

    echo
    echo "Force squash sync completed."
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
        echo "7) Force Sync All"
        echo
        echo "8) Exit"
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
                force_sync_all
                ;;

            8)
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