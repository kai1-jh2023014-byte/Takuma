# 時間割を表形式で表示し、先生用・生徒用のログインで使うプログラム


def build_timetable():
    return {
        "月曜日": ["現国", "体育", "論表1", "英コミ1", "歴史総合", "数"],
        "火曜日": ["英コミ1", "言文", "体育", "数", "現国", "化学基礎", "LHR"],
        "水曜日": ["情報1", "生物基礎", "数", "現国", "音楽or美術", "公共"],
        "木曜日": ["英コミ1", "歴史総合", "数"],
        "金曜日": [],
    }


def format_table(timetable):
    days = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日"]
    max_periods = max(len(subjects) for subjects in timetable.values())
    headers = ["曜日"] + [f"{i}限" for i in range(1, max_periods + 1)]

    def box_text(text, width):
        text = str(text) if text != "" else " "
        return f"[{text.center(width)}]"

    widths = []
    for header in headers:
        widths.append(max(len(str(header)), 8))
    for day in days:
        for index, subject in enumerate(timetable[day]):
            widths[index + 1] = max(widths[index + 1], len(str(subject)))

    lines = []
    header_line = " ".join(box_text(header, widths[i]) for i, header in enumerate(headers))
    lines.append(header_line)
    lines.append("-" * len(header_line))

    for day in days:
        cells = [day]
        cells.extend(timetable[day])
        cells.extend([""] * (max_periods - len(timetable[day])))
        row = " ".join(box_text(cell, widths[i]) for i, cell in enumerate(cells))
        lines.append(row)

    return "\n".join(lines)


def save_timetable(timetable, filename="timetable.txt"):
    with open(filename, "w", encoding="utf-8") as file:
        file.write(format_table(timetable))
        file.write("\n")


def login():
    print("ログインしてください")
    print("1. 先生用")
    print("2. 生徒用")
    mode = input("選択してください（1 or 2）: ")

    if mode == "1":
        username = input("先生のユーザー名: ")
        password = input("先生のパスワード: ")
        if username == "sensei" and password == "1234":
            print("先生としてログインしました")
            return "teacher"
        print("ログインに失敗しました")
        return None

    if mode == "2":
        username = input("生徒のユーザー名: ")
        password = input("生徒のパスワード: ")
        if username == "student" and password == "5678":
            print("生徒としてログインしました")
            return "student"
        print("ログインに失敗しました")
        return None

    print("無効な選択です")
    return None


def edit_timetable(timetable):
    print("先生用: 時間割を編集できます")
    while True:
        print("\n1. 1つのコマを編集")
        print("2. 終了")
        choice = input("選択してください: ")

        if choice == "2":
            break

        day = input("曜日を入力してください: ")
        if day not in timetable:
            print("その曜日はありません")
            continue

        try:
            period = int(input("何限目を変更しますか: "))
        except ValueError:
            print("数字を入力してください")
            continue

        if period < 1 or period > 7:
            print("1〜7限の範囲で入力してください")
            continue

        new_subject = input("新しい教科名を入力してください: ")
        if period <= len(timetable[day]):
            timetable[day][period - 1] = new_subject
        else:
            timetable[day].extend([""] * (period - len(timetable[day])))
            timetable[day][period - 1] = new_subject

        print("変更しました")
        print_timetable(timetable)


def print_timetable(timetable):
    print("時間割")
    print(format_table(timetable))
    print("\n保存先: timetable.txt")


def show_menu(role):
    print("\nページを選んでください")
    print("1. 時間割を見る")
    if role == "teacher":
        print("2. 先生用ページ")
    else:
        print("2. 生徒用ページ")
    print("3. 終了")

    choice = input("選択してください: ")
    return choice


if __name__ == "__main__":
    role = login()
    if role is None:
        raise SystemExit(0)

    timetable = build_timetable()
    while True:
        choice = show_menu(role)
        if choice == "1":
            print_timetable(timetable)
        elif choice == "2":
            if role == "teacher":
                edit_timetable(timetable)
            else:
                print("生徒用ページです。時間割を確認できます。")
        elif choice == "3":
            break
        else:
            print("無効な選択です")

    save_timetable(timetable)
